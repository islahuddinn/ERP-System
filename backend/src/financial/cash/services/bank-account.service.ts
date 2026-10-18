import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { BankAccountRepository } from "../repositories/bank-account.repository";
import { CreateBankAccountDto } from "../dto/create-bank-account.dto";

@Injectable()
export class BankAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bankAccountRepository: BankAccountRepository,
  ) {}

  async createAccount(dto: CreateBankAccountDto) {
    if (!dto.accountName?.trim()) {
      throw new BadRequestException("accountName is required");
    }
    const existing = await this.prisma.bankAccount.findFirst({
      where: { accountName: dto.accountName.trim() },
    });
    if (existing) {
      throw new BadRequestException("Bank account already exists");
    }

    const openingBalance = dto.balance ?? 0;
    if (openingBalance < 0) {
      throw new BadRequestException("Opening balance cannot be negative");
    }

    return this.prisma.$transaction(async (tx) => {
      return this.bankAccountRepository.create(tx, {
        accountName: dto.accountName.trim(),
        currency: dto.currency,
        balance: openingBalance,
      });
    });
  }

  async findAll() {
    return this.prisma.$transaction(async (tx) => {
      return this.bankAccountRepository.findAll(tx);
    });
  }

  async findOne(id: string) {
    const account = await this.bankAccountRepository.findById(this.prisma, id);
    if (!account) {
      throw new BadRequestException("Bank account not found");
    }
    return account;
  }

  async update(
    id: string,
    dto: Partial<{ accountName: string; currency: string }>,
  ) {
    await this.findOne(id);

    const payload: any = {};
    if (dto.accountName !== undefined) {
      if (!dto.accountName.trim()) {
        throw new BadRequestException("accountName cannot be empty");
      }
      payload.accountName = dto.accountName.trim();
    }
    if (dto.currency !== undefined) {
      if (!dto.currency.trim()) {
        throw new BadRequestException("currency cannot be empty");
      }
      payload.currency = dto.currency.trim();
    }

    return this.bankAccountRepository.update(this.prisma, id, payload);
  }

  async remove(id: string) {
    const account = await this.findOne(id);
    if (Number(account.balance) !== 0) {
      throw new BadRequestException(
        "Cannot delete bank account with non-zero balance",
      );
    }
    return this.bankAccountRepository.softDelete(this.prisma, id);
  }
}

