import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { JournalService } from "../../journal/journal.service";
import { RunDepreciationDto } from "../dto/run-depreciation.dto";
import { FixedAssetRepository } from "../repositories/fixed-asset.repository";
import { DepreciationRepository } from "../repositories/depreciation.repository";

@Injectable()
export class DepreciationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly fixedAssetRepository: FixedAssetRepository,
    private readonly depreciationRepository: DepreciationRepository,
  ) {}

  private async resolveDepreciationAccounts() {
    const expenseAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "EXPENSE", isActive: true },
      orderBy: { accountCode: "asc" },
    });

    const accumulatedAccount = await this.prisma.chartOfAccounts.findFirst({
      where: {
        accountType: "LIABILITY",
        isActive: true,
        OR: [
          { accountCode: { contains: "ACCUM", mode: "insensitive" } },
          { accountCode: { contains: "DEPR", mode: "insensitive" } },
        ],
      },
      orderBy: { accountCode: "asc" },
    });

    const fallbackAccum = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "LIABILITY", isActive: true },
      orderBy: { accountCode: "asc" },
    });

    return {
      expenseAccount,
      accumulatedAccount: accumulatedAccount ?? fallbackAccum,
    };
  }

  async runMonthlyDepreciation(dto: RunDepreciationDto) {
    const date = dto.date ? new Date(dto.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException("Invalid date");
    }

    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const { expenseAccount, accumulatedAccount } = await this.resolveDepreciationAccounts();

    if (!expenseAccount || !accumulatedAccount) {
      throw new BadRequestException(
        "Required COA accounts not found. Need EXPENSE and (LIABILITY) for accumulated depreciation.",
      );
    }

    const assets = await this.fixedAssetRepository.listDepreciableAssets(this.prisma);

    for (const asset of assets) {
      const already = await this.depreciationRepository.existsForMonth(
        this.prisma,
        asset.id,
        monthStart,
        monthEnd,
      );
      if (already) continue;

      // Straight-line depreciation per month (stored usefulLife as months).
      const monthly = Number(asset.cost) / Math.max(1, Number(asset.usefulLife));
      const amount = Math.min(monthly, Number(asset.bookValue));
      if (amount <= 0.0001) continue;

      const journalEntry = await this.journalService.create({
        entryDate: monthStart.toISOString(),
        description: `Depreciation - ${asset.assetName}`,
        sourceType: "DEPRECIATION",
        sourceId: `${asset.id}:${monthStart.toISOString().slice(0, 7)}`,
        postingKind: "DEPRECIATE_ASSET",
        lines: [
          {
            accountId: expenseAccount.id,
            debit: amount,
            credit: 0,
            description: "Depreciation Expense",
          },
          {
            accountId: accumulatedAccount.id,
            debit: 0,
            credit: amount,
            description: "Accumulated Depreciation",
          },
        ],
      });

      await this.journalService.post(journalEntry.id);

      await this.prisma.$transaction(async (tx) => {
        await this.depreciationRepository.create(tx, {
          assetId: asset.id,
          amount,
          date: monthStart,
          journalEntryId: journalEntry.id,
        });

        const newBookValue = Math.max(0, Number(asset.bookValue) - amount);
        await this.fixedAssetRepository.updateBookValue(tx, asset.id, newBookValue);
      });
    }

    return {
      date: monthStart,
      processedAssetCount: assets.length,
    };
  }
}
