import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { SupplierBankAccountsRepository } from "./supplier-bank-accounts.repository";
import { SuppliersRepository } from "./suppliers.repository";
import { CreateSupplierBankAccountDto } from "./dto/create-supplier-bank-account.dto";
import { UpdateSupplierBankAccountDto } from "./dto/update-supplier-bank-account.dto";
import { RequestWithUser } from "../common/interfaces";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../audit/audit-context.service";

@Injectable()
export class SupplierBankAccountsService {
  constructor(
    private readonly bankAccountsRepository: SupplierBankAccountsRepository,
    private readonly suppliersRepository: SuppliersRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  private async verifySupplierExists(supplierId: string) {
    const supplier = await this.suppliersRepository.findById(supplierId);
    if (!supplier) throw new NotFoundException("Supplier not found");
  }

  private async verifyOwnership(id: string, supplierId: string) {
    const account = await this.bankAccountsRepository.findById(id);
    if (!account || account.supplierId !== supplierId)
      throw new NotFoundException("Bank account not found");
    return account;
  }

  async create(supplierId: string, dto: CreateSupplierBankAccountDto, req: RequestWithUser) {
    await this.verifySupplierExists(supplierId);
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
        supplier: { connect: { id: supplierId } },
      });

      if (dto.isDefault) {
        const [, updated] = await this.bankAccountsRepository.setDefault(account.id, supplierId, userId);
        return updated;
      }

      return account;
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async findAll(supplierId: string) {
    await this.verifySupplierExists(supplierId);
    return this.bankAccountsRepository.findAllForSupplier(supplierId);
  }

  async findOne(supplierId: string, bankAccountId: string) {
    return this.verifyOwnership(bankAccountId, supplierId);
  }

  async update(
    supplierId: string,
    bankAccountId: string,
    dto: UpdateSupplierBankAccountDto,
    req: RequestWithUser,
  ) {
    const existing = await this.verifyOwnership(bankAccountId, supplierId);
    const { id: userId } = req.user;

    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not supplierId.
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
        const [, updated] = await this.bankAccountsRepository.setDefault(bankAccountId, supplierId, userId);
        return updated;
      }

      return account;
    } catch (error) {
      handlePrismaUniqueError(error);
    }
  }

  async setDefault(supplierId: string, bankAccountId: string, req: RequestWithUser) {
    const existing = await this.verifyOwnership(bankAccountId, supplierId);
    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not supplierId.
    this.auditContext.setEntityId(bankAccountId);
    const [, updated] = await this.bankAccountsRepository.setDefault(
      bankAccountId,
      supplierId,
      req.user.id,
    );
    return updated;
  }

  async remove(supplierId: string, bankAccountId: string) {
    const existing = await this.verifyOwnership(bankAccountId, supplierId);
    if (await this.bankAccountsRepository.hasPayments(bankAccountId)) {
      throw new BadRequestException("Cannot delete: this bank account is linked to one or more payments");
    }
    this.auditContext.setOldValue(existing);
    // Route param order makes bankAccountId the audited entity, not supplierId.
    this.auditContext.setEntityId(bankAccountId);
    await this.bankAccountsRepository.delete(bankAccountId);
    return { message: "Bank account deleted successfully" };
  }
}
