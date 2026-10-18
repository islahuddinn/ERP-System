import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";

const BANK_ACCOUNT_SELECT = {
  id: true,
  supplierId: true,
  bankName: true,
  accountTitle: true,
  accountNumber: true,
  iban: true,
  swiftCode: true,
  currency: true,
  isDefault: true,
  isActive: true,
  deletedAt: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SupplierBankAccountSelect;

@Injectable()
export class SupplierBankAccountsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.SupplierBankAccountCreateInput) {
    return this.prisma.supplierBankAccount.create({ data, select: BANK_ACCOUNT_SELECT });
  }

  async findAllForSupplier(supplierId: string) {
    return this.prisma.supplierBankAccount.findMany({
      where: { supplierId, deletedAt: null },
      select: BANK_ACCOUNT_SELECT,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string) {
    return this.prisma.supplierBankAccount.findFirst({
      where: { id, deletedAt: null },
      select: BANK_ACCOUNT_SELECT,
    });
  }

  async update(id: string, data: Prisma.SupplierBankAccountUpdateInput) {
    return this.prisma.supplierBankAccount.update({ where: { id }, data, select: BANK_ACCOUNT_SELECT });
  }

  async hasPayments(id: string): Promise<boolean> {
    // A bank account can be referenced by a PO payment (PurchasePayment) or an
    // AP vendor payment (VendorPayment). Both must block deletion (QA: bank
    // account linked to a PO payment was still deletable).
    const [vendorPayments, purchasePayments] = await Promise.all([
      this.prisma.vendorPayment.count({ where: { bankAccountId: id } }),
      this.prisma.purchasePayment.count({ where: { bankAccountId: id } }),
    ]);
    return vendorPayments > 0 || purchasePayments > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.supplierBankAccount.delete({ where: { id } });
  }

  // Unsets isDefault on all other accounts for the supplier before setting the new default
  async setDefault(id: string, supplierId: string, updatedById?: string) {
    return this.prisma.$transaction([
      this.prisma.supplierBankAccount.updateMany({
        where: { supplierId, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      }),
      this.prisma.supplierBankAccount.update({
        where: { id },
        data: { isDefault: true, updatedById },
        select: BANK_ACCOUNT_SELECT,
      }),
    ]);
  }
}
