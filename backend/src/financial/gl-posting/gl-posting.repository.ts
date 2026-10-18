import { Injectable } from "@nestjs/common";
import { EntryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { JOURNAL_INCLUDE } from "./utils/constants";
import { JournalEntryDetail } from "./utils/types";

@Injectable()
export class GlPostingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySource(
    sourceType: string,
    sourceId: string,
    postingKind: string,
  ): Promise<JournalEntryDetail | null> {
    return this.prisma.journalEntry.findFirst({
      where: { sourceType, sourceId, postingKind, deletedAt: null },
      include: JOURNAL_INCLUDE,
    });
  }

  async createPostedEntry(data: {
    entryNumber: string;
    description: string;
    entryDate: Date;
    totalDebit: number;
    totalCredit: number;
    sourceType: string;
    sourceId: string;
    postingKind: string;
    createdById?: string;
    lines: Array<{ accountId: string; debit: number; credit: number; description?: string }>;
  }): Promise<JournalEntryDetail> {
    return this.prisma.journalEntry.create({
      data: {
        entryNumber: data.entryNumber,
        description: data.description,
        entryDate: data.entryDate,
        totalDebit: data.totalDebit,
        totalCredit: data.totalCredit,
        status: EntryStatus.POSTED,
        postedAt: new Date(),
        sourceType: data.sourceType,
        sourceId: data.sourceId,
        postingKind: data.postingKind,
        createdById: data.createdById ?? null,
        journalLines: {
          create: data.lines.map((line) => ({
            accountId: line.accountId,
            description: line.description ?? null,
            debitAmount: line.debit,
            creditAmount: line.credit,
            createdById: data.createdById ?? null,
          })),
        },
      },
      include: JOURNAL_INCLUDE,
    });
  }

  async nextEntryNumber(prefixDate: string): Promise<string> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { entryNumber: { startsWith: `JE${prefixDate}` } },
      orderBy: { entryNumber: "desc" },
      select: { entryNumber: true },
    });

    let sequence = 1;
    if (lastEntry) {
      const lastSequence = Number.parseInt(lastEntry.entryNumber.slice(-3), 10);
      if (!Number.isNaN(lastSequence)) sequence = lastSequence + 1;
    }

    return `JE${prefixDate}${sequence.toString().padStart(3, "0")}`;
  }

  async sumPostedByAccountCode(accountCode: string, startDate?: Date, endDate?: Date): Promise<{ debit: number; credit: number }> {
    const lines = await this.prisma.journalLine.findMany({
      where: {
        account: { accountCode },
        journal: {
          status: EntryStatus.POSTED,
          deletedAt: null,
          ...(startDate || endDate
            ? {
                entryDate: {
                  ...(startDate ? { gte: startDate } : {}),
                  ...(endDate ? { lte: endDate } : {}),
                },
              }
            : {}),
        },
      },
      select: { debitAmount: true, creditAmount: true },
    });

    return lines.reduce(
      (acc, line) => {
        acc.debit += Number(line.debitAmount ?? 0);
        acc.credit += Number(line.creditAmount ?? 0);
        return acc;
      },
      { debit: 0, credit: 0 },
    );
  }

  async sumPostedBySourceType(
    sourceType: string,
    startDate?: Date,
    endDate?: Date,
    postingKind?: string,
  ): Promise<number> {
    const entries = await this.prisma.journalEntry.findMany({
      where: {
        sourceType,
        ...(postingKind ? { postingKind } : {}),
        status: EntryStatus.POSTED,
        deletedAt: null,
        ...(startDate || endDate
          ? {
              entryDate: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      select: { totalDebit: true },
    });

    return entries.reduce((sum, entry) => sum + Number(entry.totalDebit), 0);
  }
}
