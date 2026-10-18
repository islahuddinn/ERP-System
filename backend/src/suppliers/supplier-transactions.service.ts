import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { SupplierTransactionsRepository } from "./supplier-transactions.repository";
import { SuppliersRepository } from "./suppliers.repository";
import { CreateSupplierTransactionDto } from "./dto/create-supplier-transaction.dto";
import { UpdateSupplierTransactionDto } from "./dto/update-supplier-transaction.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";
import { RequestWithUser } from "../common/interfaces";

@Injectable()
export class SupplierTransactionsService {
  constructor(
    private readonly transactionsRepository: SupplierTransactionsRepository,
    private readonly suppliersRepository: SuppliersRepository,
  ) {}

  async create(supplierId: string, dto: CreateSupplierTransactionDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const supplier = await this.suppliersRepository.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found");

    if (dto.debit === 0 && dto.credit === 0) {
      throw new BadRequestException("Either debit or credit must be greater than zero");
    }

    this.assertDateNotBeforeSupplierCreation(dto.date, supplier.createdAt);

    return this.transactionsRepository.create({
      date: new Date(dto.date),
      type: dto.type,
      reference: dto.reference,
      description: dto.description,
      debit: new Prisma.Decimal(dto.debit),
      credit: new Prisma.Decimal(dto.credit),
      notes: dto.notes,
      createdById: userId,
      updatedById: userId,
      supplier: { connect: { id: supplierId } },
    });
  }

  async findAll(supplierId: string, queryDto: TransactionQueryDto) {
    const supplier = await this.suppliersRepository.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found");

    return this.transactionsRepository.findAllForSupplier(supplierId, queryDto);
  }

  async findOne(supplierId: string, id: string) {
    const tx = await this.transactionsRepository.findById(id);
    if (!tx || tx.supplierId !== supplierId) throw new NotFoundException("Transaction not found");
    return tx;
  }

  async update(
    supplierId: string,
    id: string,
    dto: UpdateSupplierTransactionDto,
    req: RequestWithUser,
  ) {
    const { id: userId } = req.user;

    await this.findOne(supplierId, id);

    if (
      dto.debit !== undefined &&
      dto.credit !== undefined &&
      dto.debit === 0 &&
      dto.credit === 0
    ) {
      throw new BadRequestException("Either debit or credit must be greater than zero");
    }

    if (dto.date) {
      const supplier = await this.suppliersRepository.findById(supplierId);
      if (!supplier) throw new NotFoundException("Supplier not found");
      this.assertDateNotBeforeSupplierCreation(dto.date, supplier.createdAt);
    }

    const data: Prisma.SupplierTransactionUpdateInput = {
      ...dto,
      ...(dto.date ? { date: new Date(dto.date) } : {}),
      ...(dto.debit !== undefined ? { debit: new Prisma.Decimal(dto.debit) } : {}),
      ...(dto.credit !== undefined ? { credit: new Prisma.Decimal(dto.credit) } : {}),
      updatedById: userId,
    };

    return this.transactionsRepository.update(id, data);
  }

  async remove(supplierId: string, id: string) {
    await this.findOne(supplierId, id);
    await this.transactionsRepository.delete(id);
    return { message: "Transaction deleted successfully" };
  }

  /**
   * A transaction can never predate the supplier it belongs to. Compare at
   * day granularity (YYYY-MM-DD) so a same-day entry is allowed regardless of
   * the exact creation timestamp, and to avoid timezone off-by-one issues.
   */
  private assertDateNotBeforeSupplierCreation(date: string, createdAt: Date): void {
    const txDay = date.slice(0, 10);
    const createdDay = new Date(createdAt).toISOString().slice(0, 10);
    if (txDay < createdDay) {
      throw new BadRequestException(
        `Transaction date cannot be before the supplier's creation date (${createdDay})`,
      );
    }
  }
}
