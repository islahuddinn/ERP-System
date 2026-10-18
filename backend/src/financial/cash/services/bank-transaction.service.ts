import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { JournalService } from "../../journal/journal.service";
import { BankTransactionTypeDto, CreateBankTransactionDto } from "../dto/create-bank-transaction.dto";
import { BankAccountRepository } from "../repositories/bank-account.repository";
import { BankTransactionRepository } from "../repositories/bank-transaction.repository";

@Injectable()
export class BankTransactionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly bankTransactionRepository: BankTransactionRepository,
  ) {}

  private async resolveChartAccountForCash(dto: CreateBankTransactionDto) {
    if (dto.cashAccountId) {
      const found = await this.prisma.chartOfAccounts.findUnique({
        where: { id: dto.cashAccountId },
      });
      if (!found) {
        throw new BadRequestException("cashAccountId not found in COA");
      }
      return found;
    }

    const byCode = await this.prisma.chartOfAccounts.findFirst({
      where: {
        accountType: "ASSET",
        isActive: true,
        OR: [
          { accountCode: { contains: "CASH", mode: "insensitive" } },
          { accountCode: { contains: "BANK", mode: "insensitive" } },
        ],
      },
      orderBy: { accountCode: "asc" },
    });

    if (byCode) return byCode;

    return this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "ASSET", isActive: true },
      orderBy: { accountCode: "asc" },
    });
  }

  async createTransaction(dto: CreateBankTransactionDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException("amount must be > 0");
    }

    const transactionDate = dto.transactionDate
      ? new Date(dto.transactionDate)
      : new Date();

    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException("Invalid transactionDate");
    }

    const bankAccount = await this.bankAccountRepository.findById(
      this.prisma,
      dto.bankAccountId,
    );
    if (!bankAccount || bankAccount.deletedAt) {
      throw new BadRequestException("bankAccount not found");
    }

    const counterpartyAccount = await this.prisma.chartOfAccounts.findUnique({
      where: { id: dto.counterpartyAccountId },
    });
    if (!counterpartyAccount || !counterpartyAccount.isActive) {
      throw new BadRequestException(
        "counterpartyAccountId not found or not active in COA",
      );
    }

    const cashAccount = await this.resolveChartAccountForCash(dto);
    if (!cashAccount) {
      throw new BadRequestException(
        "Required cash chart account not found. Create an ASSET/CASH/BANK account in COA.",
      );
    }

    const type = dto.type;
    const amount = Number(dto.amount);

    // Update balance + create BankTransaction record atomically.
    const bankTransaction = await this.prisma.$transaction(async (tx) => {
      if (type === BankTransactionTypeDto.WITHDRAW) {
        const currentBalance = Number(bankAccount.balance);
        if (currentBalance - amount < -0.01) {
          throw new BadRequestException("Insufficient bank balance");
        }
      }

      if (type === BankTransactionTypeDto.DEPOSIT) {
        await this.bankAccountRepository.updateBalance(
          tx,
          dto.bankAccountId,
          amount,
        );
      } else {
        await this.bankAccountRepository.updateBalance(
          tx,
          dto.bankAccountId,
          -amount,
        );
      }

      return this.bankTransactionRepository.create(tx, {
        bankAccountId: dto.bankAccountId,
        type,
        amount,
        transactionDate,
        description: dto.description,
      });
    });

    const journalEntry = await this.journalService.create({
      entryDate: transactionDate.toISOString(),
      description: `Bank ${type}: ${bankTransaction.id}`,
      sourceType: "BANK_TRANSACTION",
      sourceId: bankTransaction.id,
      postingKind: "BANK_MOVE",
      lines:
        type === BankTransactionTypeDto.DEPOSIT
          ? [
              {
                accountId: cashAccount.id,
                debit: amount,
                credit: 0,
                description: "Bank (Cash/Bank)",
              },
              {
                accountId: counterpartyAccount.id,
                debit: 0,
                credit: amount,
                description: "Counterparty",
              },
            ]
          : [
              {
                accountId: counterpartyAccount.id,
                debit: amount,
                credit: 0,
                description: "Counterparty",
              },
              {
                accountId: cashAccount.id,
                debit: 0,
                credit: amount,
                description: "Bank (Cash/Bank)",
              },
            ],
    });

    await this.journalService.post(journalEntry.id);

    await this.bankTransactionRepository.updateJournalEntryId(
      this.prisma,
      bankTransaction.id,
      journalEntry.id,
    );

    return bankTransaction;
  }

  async findAll() {
    return this.bankTransactionRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    const transaction = await this.bankTransactionRepository.findOne(
      this.prisma,
      id,
    );
    if (!transaction) {
      throw new BadRequestException("Bank transaction not found");
    }
    return transaction;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.bankTransactionRepository.softDelete(this.prisma, id);
  }

  async update(
    id: string,
    dto: Partial<{
      transactionDate: Date;
      description: string;
    }>,
  ) {
    const transaction = await this.findOne(id);
    if (!transaction) {
      throw new BadRequestException("Bank transaction not found");
    }

    if (
      dto.transactionDate &&
      Number.isNaN(new Date(dto.transactionDate).getTime())
    ) {
      throw new BadRequestException("Invalid transactionDate");
    }

    const data: Partial<{ transactionDate: Date; description: string }> = {};
    if (dto.transactionDate) data.transactionDate = new Date(dto.transactionDate);
    if (typeof dto.description === "string") data.description = dto.description;

    if (Object.keys(data).length === 0) {
      return transaction;
    }

    return this.bankTransactionRepository.update(this.prisma, id, data);
  }
}

