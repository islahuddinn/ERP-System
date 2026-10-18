import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, SupplierTransactionType } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { TransactionQueryDto } from "./dto/transaction-query.dto";
import { TopSupplierBySpend } from "./utils/interfaces";

const TRANSACTION_SELECT = {
  id: true,
  supplierId: true,
  date: true,
  type: true,
  reference: true,
  description: true,
  debit: true,
  credit: true,
  notes: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class SupplierTransactionsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.SupplierTransactionCreateInput) {
    return this.prisma.supplierTransaction.create({ data, select: TRANSACTION_SELECT });
  }

  async findAllForSupplier(supplierId: string, queryDto: TransactionQueryDto) {
    const { page = 1, limit = 20, startDate, endDate, type } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierTransactionWhereInput = { supplierId };
    if (type) where.type = type as SupplierTransactionType;
    if (startDate || endDate) {
      where.date = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {}),
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.supplierTransaction.findMany({
        where,
        select: TRANSACTION_SELECT,
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      this.prisma.supplierTransaction.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: getTotalPages(total, limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.supplierTransaction.findUnique({
      where: { id },
      select: TRANSACTION_SELECT,
    });
  }

  async update(id: string, data: Prisma.SupplierTransactionUpdateInput) {
    return this.prisma.supplierTransaction.update({
      where: { id },
      data,
      select: TRANSACTION_SELECT,
    });
  }

  async delete(id: string) {
    return this.prisma.supplierTransaction.delete({ where: { id } });
  }

  async getSupplierBalance(supplierId: string) {
    const result = await this.prisma.supplierTransaction.aggregate({
      where: { supplierId },
      _sum: { debit: true, credit: true },
    });
    return {
      totalDebit: Number(result._sum.debit ?? 0),
      totalCredit: Number(result._sum.credit ?? 0),
    };
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getTopSuppliersBySpend(limit = 5): Promise<TopSupplierBySpend[]> {
    const topSpenders = await this.prisma.supplierTransaction.groupBy({
      by: ["supplierId"],
      _sum: { debit: true },
      orderBy: { _sum: { debit: "desc" } },
      take: limit,
    });

    const supplierIds = topSpenders.map((entry) => entry.supplierId);
    const suppliers = await this.prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, name: true },
    });
    const supplierNameById = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

    return topSpenders.map((entry) => ({
      supplierId: entry.supplierId,
      supplierName: supplierNameById[entry.supplierId] ?? "Unknown",
      totalSpend: Number(entry._sum.debit ?? 0),
    }));
  }
}
