import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../../prisma/tenant-prisma-context.service";

const BANK_ACCOUNT_SELECT = {
  id: true,
  customerId: true,
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
} satisfies Prisma.CustomerBankAccountSelect;

@Injectable()
export class CustomerBankAccountsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.CustomerBankAccountCreateInput) {
    return this.prisma.customerBankAccount.create({ data, select: BANK_ACCOUNT_SELECT });
  }

  async findAllForCustomer(customerId: string) {
    return this.prisma.customerBankAccount.findMany({
      where: { customerId, deletedAt: null },
      select: BANK_ACCOUNT_SELECT,
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  }

  async findById(id: string) {
    return this.prisma.customerBankAccount.findFirst({
      where: { id, deletedAt: null },
      select: BANK_ACCOUNT_SELECT,
    });
  }

  async update(id: string, data: Prisma.CustomerBankAccountUpdateInput) {
    return this.prisma.customerBankAccount.update({
      where: { id },
      data,
      select: BANK_ACCOUNT_SELECT,
    });
  }

  async hasPayments(id: string): Promise<boolean> {
    const count = await this.prisma.customerARPayment.count({ where: { bankAccountId: id } });
    return count > 0;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customerBankAccount.delete({ where: { id } });
  }

  // Unsets isDefault on all other accounts for the customer before setting the new default
  async setDefault(id: string, customerId: string, updatedById?: string) {
    return this.prisma.$transaction([
      this.prisma.customerBankAccount.updateMany({
        where: { customerId, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      }),

      this.prisma.customerBankAccount.update({
        where: { id },
        data: { isDefault: true, updatedById },
        select: BANK_ACCOUNT_SELECT,
      }),
    ]);
  }
}
