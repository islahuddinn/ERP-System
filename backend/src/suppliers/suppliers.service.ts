import { Injectable, NotFoundException, BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { SuppliersRepository } from "./suppliers.repository";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { SupplierQueryDto } from "./dto/supplier-query.dto";
import { RequestWithUser } from "../common/interfaces";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class SuppliersService {
  constructor(
    private readonly suppliersRepository: SuppliersRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async create(dto: CreateSupplierDto, req: RequestWithUser) {
    const { id: userId } = req.user;
    const { openingBalance, ...supplierData } = dto;

    if (supplierData.email) {
      const emailConflict = await this.suppliersRepository.findByEmail(supplierData.email);
      if (emailConflict) throw new ConflictException(`A supplier with email "${supplierData.email}" already exists`);
    }
    if (supplierData.phone) {
      const phoneConflict = await this.suppliersRepository.findByPhone(supplierData.phone);
      if (phoneConflict) throw new ConflictException(`A supplier with phone "${supplierData.phone}" already exists`);
    }

    const data: Prisma.SupplierCreateInput = {
      ...supplierData,
      createdById: userId,
      updatedById: userId,
    };

    if (openingBalance?.amount !== undefined && openingBalance.amount !== null) {
      data.openingBalanceAmount = new Prisma.Decimal(openingBalance.amount);
      data.openingBalanceDate = openingBalance.date ? new Date(openingBalance.date) : new Date();
      data.openingBalanceNote = openingBalance.note;
      data.openingBalanceSetById = userId;
    }

    try {
      return await this.suppliersRepository.create(data);
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async findAll(queryDto: SupplierQueryDto) {
    return this.suppliersRepository.findAll(queryDto);
  }

  async findOne(id: string) {
    const supplier = await this.suppliersRepository.findById(id);
    if (!supplier) throw new NotFoundException("Supplier not found");
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const existing = await this.findOne(id);
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);

    const { openingBalance, ...supplierData } = dto;

    if (supplierData.email) {
      const emailConflict = await this.suppliersRepository.findByEmail(supplierData.email, id);
      if (emailConflict) throw new ConflictException(`A supplier with email "${supplierData.email}" already exists`);
    }
    if (supplierData.phone) {
      const phoneConflict = await this.suppliersRepository.findByPhone(supplierData.phone, id);
      if (phoneConflict) throw new ConflictException(`A supplier with phone "${supplierData.phone}" already exists`);
    }

    const data: Prisma.SupplierUpdateInput = {
      ...supplierData,
      updatedById: userId,
    };

    if (openingBalance !== undefined) {
      const clearing = openingBalance.amount === undefined || openingBalance.amount === null;

      // Determine whether the opening balance is actually being changed vs the
      // stored value. Editing other fields (e.g. name) must NOT trip the PO guard
      // or re-write the opening-balance columns — otherwise the audit diff falsely
      // shows the opening balance as changed (QA #2) and the guard falsely fires (QA #6).
      const currentAmount =
        existing.openingBalanceAmount !== null && existing.openingBalanceAmount !== undefined
          ? new Prisma.Decimal(existing.openingBalanceAmount)
          : null;
      const incomingAmount = clearing ? null : new Prisma.Decimal(openingBalance.amount);

      const amountChanged =
        (currentAmount === null) !== (incomingAmount === null) ||
        (currentAmount !== null && incomingAmount !== null && !currentAmount.equals(incomingAmount));

      // Only compare date/note when an amount is present on both sides.
      const currentDate = existing.openingBalanceDate
        ? new Date(existing.openingBalanceDate).toISOString().slice(0, 10)
        : null;
      const incomingDate = clearing ? null : openingBalance.date ?? currentDate;
      const dateChanged = !clearing && (incomingDate ?? null) !== (currentDate ?? null);

      const currentNote = existing.openingBalanceNote ?? null;
      const incomingNote = clearing ? null : openingBalance.note ?? null;
      const noteChanged = !clearing && incomingNote !== currentNote;

      const openingBalanceChanged = amountChanged || dateChanged || noteChanged;

      if (openingBalanceChanged) {
        const hasPOs = await this.suppliersRepository.hasPurchaseOrders(id);
        if (hasPOs) {
          throw new BadRequestException("Cannot modify opening balance after purchase orders exist");
        }

        if (clearing) {
          data.openingBalanceAmount = null;
          data.openingBalanceDate = null;
          data.openingBalanceNote = null;
          data.openingBalanceSetById = null;
        } else {
          data.openingBalanceAmount = incomingAmount;
          // Preserve the existing date when the client did not send a new one,
          // so re-saving an unchanged balance never rewrites the date.
          data.openingBalanceDate = openingBalance.date
            ? new Date(openingBalance.date)
            : existing.openingBalanceDate ?? new Date();
          data.openingBalanceNote = openingBalance.note;
          data.openingBalanceSetById = userId;
        }
      }
      // else: opening balance unchanged → leave the columns untouched.
    }

    try {
      return await this.suppliersRepository.update(id, data);
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async remove(id: string, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(id);

    // Block deletion when the supplier is referenced by procurement records.
    // GRNs link to a supplier only through their purchase order, so a PO check
    // covers both (QA: supplier with linked POs/GRNs must not be deletable).
    const { purchaseOrders, grns } = await this.suppliersRepository.countProcurementLinks(id);
    if (purchaseOrders > 0 || grns > 0) {
      throw new BadRequestException(
        "Cannot delete supplier — it is referenced by existing purchase orders/GRNs",
      );
    }

    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);
    await this.suppliersRepository.softDelete(id, userId);
    return { message: "Supplier deleted successfully" };
  }

  async toggleActive(id: string, req: RequestWithUser) {
    const { id: userId } = req.user;
    const existing = await this.findOne(id);
    this.auditContext.setOldValue(existing);
    this.auditContext.setEntityLabel(existing.name);
    return this.suppliersRepository.toggleActive(id, userId);
  }

  async dropdown() {
    return this.suppliersRepository.dropdown();
  }
}
