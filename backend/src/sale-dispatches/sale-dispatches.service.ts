import { BadRequestException, Injectable } from "@nestjs/common";
import { SaleDispatchStatus } from "@prisma/tenant-client";
import {
  SaleDispatchesRepository,
  SaleDispatchSummary,
  SaleDispatchWithDetails,
} from "./sale-dispatches.repository";
import { SaleDispatchQueryDto } from "./dto/sale-dispatch-query.dto";
import { UpdateSaleDispatchDto } from "./dto/update-sale-dispatch.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { RequestWithUser } from "src/common/interfaces";
import { PrismaService } from "../prisma/prisma.service";
import { AuditContextService } from "../audit/audit-context.service";

// ---------------------------------------------------------------------------
// Grouped detail types
// ---------------------------------------------------------------------------

export type ResolvedUser = { id: string; firstName: string; lastName: string };

export type DispatchBatchAllocation = {
  dispatchItemId: string;
  productBatchId: string;
  batchNumber: string;
  quantity: number;
};

export type DispatchGroupedItem = {
  saleItemId: string;
  itemName: string;
  sku: string | null;
  orderedQuantity: number;
  dispatchedQuantity: number;
  batches: DispatchBatchAllocation[];
};

export type SaleDispatchDetail = Omit<
  SaleDispatchWithDetails,
  "items" | "siteManagerId" | "dispatchOfficerId" | "createdById"
> & {
  items: DispatchGroupedItem[];
  siteManager: ResolvedUser | null;
  dispatchOfficer: ResolvedUser | null;
  createdBy: ResolvedUser | null;
};

// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Partial<Record<SaleDispatchStatus, SaleDispatchStatus[]>> = {
  [SaleDispatchStatus.DRAFT]: [SaleDispatchStatus.APPROVED],
  [SaleDispatchStatus.APPROVED]: [SaleDispatchStatus.DRAFT, SaleDispatchStatus.DELIVERED],
};

@Injectable()
export class SaleDispatchesService {
  constructor(
    private readonly saleDispatchesRepository: SaleDispatchesRepository,
    private readonly prisma: PrismaService,
    private readonly auditContext: AuditContextService,
  ) {}

  async generateDispatches(
    saleId: string,
    req: RequestWithUser,
  ): Promise<SaleDispatchWithDetails[]> {
    const { id: userId } = req.user;
    return this.saleDispatchesRepository.generateFromSale(saleId, userId);
  }

  async findAll(
    saleDispatchQueryDto: SaleDispatchQueryDto,
  ): Promise<PaginatedResponse<SaleDispatchSummary>> {
    return this.saleDispatchesRepository.findAll(saleDispatchQueryDto);
  }

  async findOne(saleDispatchId: string): Promise<SaleDispatchDetail> {
    const dispatch = await this.saleDispatchesRepository.findById(saleDispatchId);

    const userIds = [
      dispatch.siteManagerId,
      dispatch.dispatchOfficerId,
      dispatch.createdById,
    ].filter(Boolean);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    const { siteManagerId, dispatchOfficerId, createdById, items, ...rest } = dispatch;

    return {
      ...rest,
      items: this.groupItems(items),
      siteManager: userMap.get(siteManagerId) ?? null,
      dispatchOfficer: userMap.get(dispatchOfficerId) ?? null,
      createdBy: userMap.get(createdById) ?? null,
    };
  }

  async update(
    saleDispatchId: string,
    updateSaleDispatchDto: UpdateSaleDispatchDto,
    req: RequestWithUser,
  ): Promise<SaleDispatchWithDetails> {
    const { id: userId } = req.user;

    const dispatch = await this.saleDispatchesRepository.findById(saleDispatchId);

    const { status, dispatchOfficerId, notes } = updateSaleDispatchDto;

    if (dispatch.status === SaleDispatchStatus.DELIVERED) {
      throw new BadRequestException("Delivered dispatches cannot be modified.");
    }

    if (status) {
      const allowed = VALID_TRANSITIONS[dispatch.status] ?? [];

      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Cannot transition from ${dispatch.status} to ${status}. Allowed: ${allowed.join(", ")}`,
        );
      }
    }

    if (
      (dispatchOfficerId || notes !== undefined) &&
      dispatch.status !== SaleDispatchStatus.DRAFT
    ) {
      throw new BadRequestException("Officer and notes can only be changed on a DRAFT dispatch.");
    }

    this.auditContext.setOldValue(dispatch);

    return this.saleDispatchesRepository.update(
      saleDispatchId,
      updateSaleDispatchDto,
      dispatch,
      userId,
    );
  }

  // ---------------------------------------------------------------------------

  private groupItems(items: SaleDispatchWithDetails["items"]): DispatchGroupedItem[] {
    const itemMap = new Map<string, DispatchGroupedItem>();

    for (const row of items) {
      if (!itemMap.has(row.saleItemId)) {
        itemMap.set(row.saleItemId, {
          saleItemId: row.saleItemId,
          itemName: row.saleItem.itemName,
          sku: row.saleItem.sku ?? null,
          orderedQuantity: Number(row.saleItem.quantity),
          dispatchedQuantity: Number(row.saleItem.dispatchedQuantity),
          batches: [],
        });
      }
      itemMap.get(row.saleItemId)!.batches.push({
        dispatchItemId: row.id,
        productBatchId: row.productBatchId,
        batchNumber: row.productBatch.batchNumber,
        quantity: row.quantity,
      });
    }

    return [...itemMap.values()];
  }
}
