import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CustomerBankAccountsRepository } from "./customer-bank-accounts.repository";
import { CustomerRepository } from "../customers/customers.repository";
import { CreateCustomerBankAccountDto } from "./dto/create-customer-bank-account.dto";
import { UpdateCustomerBankAccountDto } from "./dto/update-customer-bank-account.dto";
import { RequestWithUser } from "../../common/interfaces";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";

@Injectable()
export class CustomerBankAccountsService {
  constructor(
    private readonly bankAccountsRepository: CustomerBankAccountsRepository,
    private readonly customersRepository: CustomerRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  private async verifyCustomerExists(customerId: string) {
    const customer = await this.customersRepository.findById(customerId);
    if (!customer) throw new NotFoundException("Customer not found");
  }

  private async verifyOwnership(id: string, customerId: string) {
    const account = await this.bankAccountsRepository.findById(id);
    if (!account || account.customerId !== customerId)
      throw new NotFoundException("Bank account not found");
    return account;
  }

  async create(customerId: string, dto: CreateCustomerBankAccountDto, req: RequestWithUser) {
    await this.verifyCustomerExists(customerId);
    const { id: userId } = req.user;

    try {
      const account = await this.bankAccountsRepository.create({
        bankName: dto.bankName,
        accountTitle: dto.accountTitle,
        accountNumber: dto.accountNumber,
        // Store empty optional unique fields as NULL so they don't collide on the unique index.
        iban: dto.iban?.trim() || null,
        swiftCode: dto.swiftCode?.trim() || null,
        currency: dto.currency ?? "PKR",
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
        createdById: userId,
        updatedById: userId,
        customer: { connect: { id: customerId } },
      });

      if (dto.isDefault) {
        const [, updated] = await this.bankAccountsRepository.setDefault(
          account.id,
          customerId,
          userId,
        );
        return updated;
      }

      return account;
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async findAll(customerId: string) {
    await this.verifyCustomerExists(customerId);
    return this.bankAccountsRepository.findAllForCustomer(customerId);
  }

  async findOne(customerId: string, bankAccountId: string) {
    return this.verifyOwnership(bankAccountId, customerId);
  }

  async update(
    customerId: string,
    bankAccountId: string,
    dto: UpdateCustomerBankAccountDto,
    req: RequestWithUser,
  ) {
    const existing = await this.verifyOwnership(bankAccountId, customerId);
    const { id: userId } = req.user;

    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not customerId.
    this.auditContext.setEntityId(bankAccountId);

    try {
      const account = await this.bankAccountsRepository.update(bankAccountId, {
        ...dto,
        // A cleared optional unique field must be stored as NULL, not "" — an empty
        // string collides with other empty IBANs on the unique index (QA #9).
        ...(dto.iban !== undefined ? { iban: dto.iban?.trim() || null } : {}),
        ...(dto.swiftCode !== undefined
          ? { swiftCode: dto.swiftCode?.trim() || null }
          : {}),
        updatedById: userId,
      });

      if (dto.isDefault) {
        const [, updated] = await this.bankAccountsRepository.setDefault(
          bankAccountId,
          customerId,
          userId,
        );
        return updated;
      }

      return account;
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async setDefault(customerId: string, bankAccountId: string, req: RequestWithUser) {
    const existing = await this.verifyOwnership(bankAccountId, customerId);
    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not customerId.
    this.auditContext.setEntityId(bankAccountId);
    const [, updated] = await this.bankAccountsRepository.setDefault(
      bankAccountId,
      customerId,
      req.user.id,
    );
    return updated;
  }

  async remove(customerId: string, bankAccountId: string) {
    const existing = await this.verifyOwnership(bankAccountId, customerId);
    if (await this.bankAccountsRepository.hasPayments(bankAccountId)) {
      throw new BadRequestException("Cannot delete: this bank account is linked to one or more payments");
    }
    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not customerId.
    this.auditContext.setEntityId(bankAccountId);
    await this.bankAccountsRepository.delete(bankAccountId);
    return { message: "Bank account deleted successfully" };
  }
}
