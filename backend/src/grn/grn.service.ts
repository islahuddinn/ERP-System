import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { GrnRepository, GRN_INCLUDE } from "./grn.repository";
import { CreateGrnDto, GrnQueryDto, CreateGrnItemDto } from "./dto";
import { PrismaService } from "../prisma/prisma.service";
import { RequestWithUser } from "src/common/interfaces";
import { Prisma, PurchaseStatus } from "@prisma/tenant-client";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { GlPostingService } from "../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../financial/gl-posting/utils/enums";

@Injectable()
export class GrnService {
  private readonly logger = new Logger(GrnService.name);

  constructor(
    private readonly grnRepository: GrnRepository,
    private readonly prisma: PrismaService,
    private readonly glPostingService: GlPostingService,
  ) {}

  // ── GRN (Goods Received Note) ──────────────────────────────────────────────────────────

  async create(
    createDto: CreateGrnDto,
    req: RequestWithUser,
  ): Promise<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>> {
    const { id: userId } = req.user;

    const { purchaseOrderId, items } = createDto;

    /**
     * Check Purchase Order Existence and Validity:
     *  - PO must exist and not be cancelled
     * - Received quantities in GRN cannot exceed remaining quantities on the PO
     */
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      select: {
        status: true,
        items: {
          select: {
            rawMaterialId: true,
            quantity: true,
            receivedQty: true,
            unitPrice: true,
            rawMaterial: { select: { name: true } },
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException("Purchase order not found.");
    }

    switch (po.status) {
      case PurchaseStatus.DRAFT:
        throw new BadRequestException(
          "Cannot create a GRN for a draft purchase order. Please Approve the purchase order first.",
        );

      case PurchaseStatus.CANCELLED:
        throw new BadRequestException("Cannot create a GRN for a cancelled purchase order.");

      case PurchaseStatus.RECEIVED:
        throw new BadRequestException(
          "This purchase order has been fully received — no further GRNs needed.",
        );
    }

    /** GRN may include a subset of PO lines (partial receipt). Every line must exist on the PO. */
    const poIds = new Set(po.items.map((i) => i.rawMaterialId));
    const grnIds = new Set(items.map((i) => i.rawMaterialId));

    const missingInPo = [...grnIds].filter((id) => !poIds.has(id));
    if (missingInPo.length) {
      throw new BadRequestException(
        `One or more GRN items are not on the linked purchase order: ${missingInPo.join(", ")}.`,
      );
    }

    // Group GRN items by raw material to handle multiple items for same material (Issue 2)
    const materialReceivedMap = new Map<string, number>();

    for (const item of items) {
      const current = materialReceivedMap.get(item.rawMaterialId) ?? 0;
      materialReceivedMap.set(item.rawMaterialId, current + item.receivedQuantity);
    }

    for (const [rawMaterialId, totalReceived] of materialReceivedMap) {
      const poItem = po.items.find((i) => i.rawMaterialId === rawMaterialId);

      if (!poItem) {
        throw new BadRequestException(
          `Raw material ${rawMaterialId} is not on the linked purchase order.`,
        );
      }

      const remainingQty = Math.max(0, poItem.quantity - poItem.receivedQty);
      const materialName = poItem.rawMaterial?.name ?? rawMaterialId;

      // Issues 1 & 2: prevent over-receiving against PO quantity
      if (totalReceived > remainingQty) {
        throw new BadRequestException(
          `${materialName}: received quantity (${totalReceived}) exceeds the remaining purchase order quantity (${remainingQty}).`,
        );
      }
    }

    /**
     * Validate GRN items (raw material existence, UOM existence)
     */
    await this.validateGrnItems(items);

    /**
     * Validate batch allocations: quantity sums, dates, and site existence
     */
    await this.validateBatchAllocations(items, createDto.receivedDate);

    // If the client supplied a receiving number, use it as-is. Otherwise generate
    // one, retrying on a unique-constraint collision (concurrent creates) by bumping
    // the sequence so a duplicate never surfaces to the user.
    let grn: Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>;

    if (createDto.receivingNumber) {
      grn = await this.grnRepository.create(
        { ...createDto, receivingNumber: createDto.receivingNumber, receivedById: userId },
        userId,
      );
    } else {
      grn = await this.createWithGeneratedNumber(createDto, userId);
    }

    try {
      await this.postGrnJournal(grn.id, items, po.items, createDto.receivedDate, userId);
    } catch (error: any) {
      // Stock receipt already committed — GL posting is best-effort until accounts are configured.
      this.logger.warn(
        `GRN ${grn.receivingNumber}: inventory journal posting skipped — ${error?.message || error}`,
      );
    }
    return grn;
  }

  private async createWithGeneratedNumber(
    createDto: CreateGrnDto,
    userId: string,
  ): Promise<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const receivingNumber = await this.generateGrnNumber(attempt);
      try {
        return await this.grnRepository.create(
          { ...createDto, receivingNumber, receivedById: userId },
          userId,
        );
      } catch (error: any) {
        const isDuplicate =
          error?.code === "P2002" &&
          (error?.meta?.target?.includes?.("receiving_number") ||
            String(error?.meta?.target ?? "").includes("receiving_number"));
        if (isDuplicate && attempt < 4) continue;
        throw error;
      }
    }
    throw new ConflictException("Could not generate a unique GRN number. Please retry.");
  }

  private async postGrnJournal(
    grnId: string,
    items: CreateGrnItemDto[],
    poItems: Array<{ rawMaterialId: string; unitPrice: unknown }>,
    receivedDate: string,
    userId: string,
  ): Promise<void> {
    const inventoryValue = items.reduce((sum, item) => {
      const poItem = poItems.find((row) => row.rawMaterialId === item.rawMaterialId);
      const unitPrice = Number(poItem?.unitPrice ?? 0);
      return sum + unitPrice * Number(item.receivedQuantity);
    }, 0);

    if (inventoryValue <= 0) return;

    await this.glPostingService.postBalancedEntry({
      sourceType: GlSourceType.GRN,
      sourceId: grnId,
      postingKind: GlPostingKind.RECEIVE_INVENTORY,
      entryDate: new Date(receivedDate),
      description: `GRN inventory receipt ${grnId}`,
      createdById: userId,
      lines: [
        { accountKey: "INVENTORY", debit: inventoryValue, credit: 0, description: "Goods received" },
        { accountKey: "AP", debit: 0, credit: inventoryValue, description: "GRNI / accounts payable" },
      ],
    });
  }

  /**
   * Validates each item's batch allocations:
   * - quantities sum exactly to receivedQuantity (epsilon tolerance for floats)
   * - manufacturingDate <= expiryDate when both provided
   * - expiryDate is not in the past and not earlier than the received date
   * - all referenced siteIds exist
   */
  private async validateBatchAllocations(
    items: CreateGrnItemDto[],
    receivedDateStr: string,
  ): Promise<void> {
    const EPSILON = 1e-6;

    const receivedDate = new Date(receivedDateStr);
    receivedDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const siteIds = new Set<string>();

    for (const item of items) {
      const totalAllocated = item.batches.reduce((sum, b) => sum + b.quantity, 0);

      if (Math.abs(totalAllocated - item.receivedQuantity) > EPSILON) {
        throw new BadRequestException(
          `Raw material ${item.rawMaterialId}: sum of batch allocation quantities (${totalAllocated}) ` +
            `must equal receivedQuantity (${item.receivedQuantity}).`,
        );
      }

      for (const batch of item.batches) {
        siteIds.add(batch.siteId);

        if (batch.manufacturingDate && batch.expiryDate) {
          if (new Date(batch.manufacturingDate) > new Date(batch.expiryDate)) {
            throw new BadRequestException(
              `Raw material ${item.rawMaterialId}: manufacturingDate (${batch.manufacturingDate}) ` +
                `cannot be after expiryDate (${batch.expiryDate}).`,
            );
          }
        }

        if (batch.expiryDate) {
          const expiry = new Date(batch.expiryDate);

          if (expiry < today) {
            throw new BadRequestException(
              `Raw material ${item.rawMaterialId}: expiryDate (${batch.expiryDate}) cannot be in the past.`,
            );
          }

          if (expiry < receivedDate) {
            throw new BadRequestException(
              `Raw material ${item.rawMaterialId}: expiryDate (${batch.expiryDate}) cannot be earlier than the received date.`,
            );
          }
        }
      }
    }

    const sites = await this.prisma.site.findMany({
      where: { id: { in: [...siteIds] } },
      select: { id: true },
    });

    const foundSiteIds = new Set(sites.map((s) => s.id));

    for (const siteId of siteIds) {
      if (!foundSiteIds.has(siteId)) {
        throw new NotFoundException(`Site ${siteId} not found.`);
      }
    }
  }

  async findAll(
    grnQueryDto: GrnQueryDto,
  ): Promise<PaginatedResponse<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>>> {
    return this.grnRepository.findAll(grnQueryDto);
  }

  async findOne(grnId: string): Promise<Prisma.GRNGetPayload<{ include: typeof GRN_INCLUDE }>> {
    const found = await this.grnRepository.findOne(grnId);

    if (!found) throw new NotFoundException("GRN not found.");

    return found;
  }

  async getStats(): Promise<{ total: number; completed: number; completionRate: number }> {
    return this.grnRepository.getGrnStats();
  }

  // ── Helpers — Business Logic ──────────────────────────────────────────────────────────────

  private async validateGrnItems(items: CreateGrnItemDto[]) {
    const rawMaterialIds = [...new Set(items.map((i) => i.rawMaterialId))];
    const uomIds = [...new Set(items.map((i) => i.uomId))];

    const [rawMaterials, uoms] = await Promise.all([
      this.prisma.rawMaterial.findMany({
        where: { id: { in: rawMaterialIds } },
        select: { id: true },
      }),

      this.prisma.uOM.findMany({
        where: { id: { in: uomIds } },
        select: { id: true },
      }),
    ]);

    const foundRawMaterialIds = new Set(rawMaterials.map((r) => r.id));
    const foundUomIds = new Set(uoms.map((u) => u.id));

    for (const item of items) {
      const { rawMaterialId, uomId } = item;

      if (!foundRawMaterialIds.has(rawMaterialId)) {
        throw new NotFoundException(`Raw material ${rawMaterialId} not found.`);
      }

      if (!foundUomIds.has(uomId)) {
        throw new NotFoundException(`UOM ${uomId} not found.`);
      }
    }
  }

  private async generateGrnNumber(offset = 0): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const prefix = `GRN-${year}${month}-`;
    const maxSeq = await this.grnRepository.getMaxReceivingSequence(prefix);
    return `${prefix}${String(maxSeq + 1 + offset).padStart(4, "0")}`;
  }
}
