import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BOMStatus } from "@prisma/tenant-client";
import { AuditContextService } from "../audit/audit-context.service";
import { PrismaService } from "../prisma/prisma.service";
import { RequestWithUser } from "../common/interfaces";
import { BomRepository, BomWithRelations } from "./bom.repository";
import { CreateBomDto } from "./dto/create-bom.dto";
import { UpdateBomDto, UpdateBomStatusDto } from "./dto/update-bom.dto";
import { BomQueryDto } from "./dto/bom-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

@Injectable()
export class BomService {
  constructor(
    private readonly bomRepository: BomRepository,
    private readonly prisma: PrismaService,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(createBomDto: CreateBomDto, req: RequestWithUser): Promise<BomWithRelations> {
    const { id: userId } = req.user;

    const { productId, items, name, description } = createBomDto;

    // Name uniqueness is scoped to non-deleted BOMs only — a soft-deleted BOM
    // with the same name must not block re-creation (#22).
    const nameClash = await this.bomRepository.findActiveByName(name);
    if (nameClash) {
      throw new ConflictException(`A BOM with the name "${name}" already exists`);
    }

    await this.validateProductExists(productId);
    await this.validateRawMaterialIds(items.map((i) => i.rawMaterialId));
    await this.validateUomIds(items.map((i) => i.uomId));
    this.validateNoDuplicateRawMaterials(items.map((i) => i.rawMaterialId));

    const bomNumber = await this.bomRepository.generateBomNumber();

    return this.bomRepository.create({
      bomNumber,
      productId,
      name,
      description,
      createdById: userId,
      items,
    });
  }

  async findAll(bomQueryDto: BomQueryDto): Promise<PaginatedResponse<BomWithRelations>> {
    return this.bomRepository.findAll(bomQueryDto);
  }

  async findOne(bomId: string): Promise<BomWithRelations> {
    const bom = await this.bomRepository.findById(bomId);

    if (!bom) throw new NotFoundException(`BOM "${bomId}" not found`);

    return bom;
  }

  async findActiveByProduct(productId: string): Promise<BomWithRelations> {
    const bom = await this.bomRepository.findActiveByProduct(productId);

    if (!bom) throw new NotFoundException(`No active BOM found for product "${productId}"`);

    return bom;
  }

  async update(
    bomId: string,
    updateBomDto: UpdateBomDto,
    req: RequestWithUser,
  ): Promise<BomWithRelations> {
    const { id: userId } = req.user;

    // Fetch the FULL record (not the lean variant) so the @Auditable interceptor
    // can build an accurate field-level UPDATE diff via setOldValue.
    const existing = await this.bomRepository.findById(bomId);
    if (!existing) throw new NotFoundException(`BOM "${bomId}" not found`);

    const { name, description, items } = updateBomDto;

    if (existing.status !== BOMStatus.DRAFT) {
      throw new BadRequestException(
        `Only DRAFT BOMs can be updated. Current status: ${existing.status}`,
      );
    }

    // Capture the pre-mutation snapshot BEFORE the DB write so the interceptor
    // records what changed.
    this.auditContext.setOldValue(existing);

    if (items) {
      await this.validateRawMaterialIds(items.map((i) => i.rawMaterialId));
      await this.validateUomIds(items.map((i) => i.uomId));
      this.validateNoDuplicateRawMaterials(items.map((i) => i.rawMaterialId));
    }

    const bom = await this.bomRepository.update(
      bomId,
      { name, description, updatedById: userId },
      items,
    );

    this.auditContext.setEntityLabel(bom.bomNumber);

    return bom;
  }

  async updateStatus(
    bomId: string,
    updateBomStatusDto: UpdateBomStatusDto,
    req: RequestWithUser,
  ): Promise<BomWithRelations> {
    const { id: userId } = req.user;

    // Fetch the FULL record (not the lean variant) so the @Auditable interceptor
    // can build an accurate status-change diff via setOldValue. Without an old
    // snapshot, buildDiff(null, new) returns null and the UPDATE log is skipped
    // entirely — meaning status changes would never be audited.
    const existing = await this.bomRepository.findById(bomId);
    if (!existing) throw new NotFoundException(`BOM "${bomId}" not found`);

    const { status } = updateBomStatusDto;

    this.validateStatusTransition(existing.status, status);

    if (status === BOMStatus.ACTIVE && existing.items.length === 0) {
      throw new BadRequestException("Cannot activate a BOM with no items");
    }

    // Capture the pre-mutation snapshot BEFORE the DB write so the interceptor
    // records the status transition (and any other change).
    this.auditContext.setOldValue(existing);

    const bom = await this.bomRepository.updateStatus(bomId, status, userId);

    this.auditContext.setEntityLabel(bom.bomNumber);

    return bom;
  }

  private validateStatusTransition(current: BOMStatus, next: BOMStatus): void {
    const allowed: Partial<Record<BOMStatus, BOMStatus[]>> = {
      [BOMStatus.DRAFT]: [BOMStatus.ACTIVE],
      [BOMStatus.ACTIVE]: [BOMStatus.INACTIVE],
      [BOMStatus.INACTIVE]: [BOMStatus.ACTIVE],
    };

    if (current === next) {
      throw new BadRequestException(`BOM is already ${current}`);
    }

    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition: ${current} → ${next}. Allowed: ${allowed[current]?.join(", ") ?? "none"}`,
      );
    }
  }

  async remove(bomId: string): Promise<{ message: string }> {
    // Fetch the FULL record so the @Auditable DELETE log captures a complete
    // snapshot of what was removed (the interceptor forces newValue = null for
    // DELETE and reads the deleted state from the old snapshot).
    const existing = await this.bomRepository.findById(bomId);
    if (!existing) throw new NotFoundException(`BOM "${bomId}" not found`);

    if (existing.status === BOMStatus.ACTIVE) {
      throw new BadRequestException("Cannot delete an ACTIVE BOM — deactivate it first");
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.bomNumber);

    await this.bomRepository.softDelete(bomId);

    return { message: `BOM "${existing.bomNumber}" deleted successfully` };
  }

  // ── Private validation helpers ────────────────────────────────────────────

  private async validateProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(`Product "${productId}" not found or inactive`);
  }

  private async validateRawMaterialIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const found = await this.prisma.rawMaterial.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((r) => r.id));
    const invalid = ids.filter((id) => !foundSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(`Raw material(s) not found: ${invalid.join(", ")}`);
    }
  }

  private async validateUomIds(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const unique = [...new Set(ids)];
    const found = await this.prisma.uOM.findMany({
      where: { id: { in: unique }, isActive: true },
      select: { id: true },
    });
    const foundSet = new Set(found.map((u) => u.id));
    const invalid = unique.filter((id) => !foundSet.has(id));
    if (invalid.length) {
      throw new BadRequestException(`UOM(s) not found or inactive: ${invalid.join(", ")}`);
    }
  }

  private validateNoDuplicateRawMaterials(rawMaterialIds: string[]): void {
    const seen = new Set<string>();
    for (const id of rawMaterialIds) {
      if (seen.has(id)) {
        throw new BadRequestException(`Duplicate raw material detected in items: ${id}`);
      }
      seen.add(id);
    }
  }
}
