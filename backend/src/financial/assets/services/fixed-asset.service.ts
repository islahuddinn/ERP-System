import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { JournalService } from "../../journal/journal.service";
import { CreateFixedAssetDto } from "../dto/create-fixed-asset.dto";
import { FixedAssetRepository } from "../repositories/fixed-asset.repository";

@Injectable()
export class FixedAssetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly fixedAssetRepository: FixedAssetRepository,
  ) {}

  private async resolveAssetAccounts(dto: CreateFixedAssetDto) {
    const assetAccount = dto.assetAccountId
      ? await this.prisma.chartOfAccounts.findUnique({
          where: { id: dto.assetAccountId },
        })
      : await this.prisma.chartOfAccounts.findFirst({
          where: { accountType: "ASSET", isActive: true },
          orderBy: { accountCode: "asc" },
        });

    const cashAccount = dto.cashAccountId
      ? await this.prisma.chartOfAccounts.findUnique({
          where: { id: dto.cashAccountId },
        })
      : await this.prisma.chartOfAccounts.findFirst({
          where: { accountType: "ASSET", isActive: true },
          orderBy: { accountCode: "asc" },
        });

    if (!assetAccount || !cashAccount) {
      throw new BadRequestException(
        "Required COA accounts not found. Create ASSET accounts for asset and cash/bank.",
      );
    }

    return { assetAccount, cashAccount };
  }

  async purchaseAsset(dto: CreateFixedAssetDto) {
    if (!dto.assetName?.trim()) {
      throw new BadRequestException("assetName is required");
    }
    if (dto.cost <= 0) {
      throw new BadRequestException("cost must be > 0");
    }
    if (dto.usefulLife <= 0) {
      throw new BadRequestException("usefulLife must be >= 1 (months)");
    }

    const { assetAccount, cashAccount } = await this.resolveAssetAccounts(dto);
    const purchaseDate = dto.purchaseDate ?? new Date();

    const asset = await this.prisma.$transaction(async (tx) => {
      return this.fixedAssetRepository.create(tx, {
        assetName: dto.assetName.trim(),
        cost: Number(dto.cost),
        usefulLife: Number(dto.usefulLife),
        depreciationMethod: dto.depreciationMethod,
        bookValue: Number(dto.cost),
      });
    });

    const journalEntry = await this.journalService.create({
      entryDate: new Date(purchaseDate).toISOString(),
      description: `Fixed Asset Purchase ${asset.assetName}`,
      sourceType: "FIXED_ASSET",
      sourceId: asset.id,
      postingKind: "CAPITALIZE_ASSET",
      lines: [
        {
          accountId: assetAccount.id,
          debit: Number(dto.cost),
          credit: 0,
          description: "Fixed Asset",
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: Number(dto.cost),
          description: "Cash/Bank",
        },
      ],
    });

    await this.journalService.post(journalEntry.id);
    return asset;
  }

  async findAll() {
    return this.fixedAssetRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    const asset = await this.fixedAssetRepository.findById(this.prisma, id);
    if (!asset) {
      throw new BadRequestException("Asset not found");
    }
    return asset;
  }

  async update(
    id: string,
    dto: Partial<{
      assetName: string;
      usefulLife: number;
      depreciationMethod: string;
    }>,
  ) {
    await this.findOne(id);

    const payload: any = {};
    if (dto.assetName !== undefined) {
      if (!dto.assetName.trim()) {
        throw new BadRequestException("assetName cannot be empty");
      }
      payload.assetName = dto.assetName.trim();
    }
    if (dto.usefulLife !== undefined) {
      if (dto.usefulLife <= 0) {
        throw new BadRequestException("usefulLife must be >= 1");
      }
      payload.usefulLife = Number(dto.usefulLife);
    }
    if (dto.depreciationMethod !== undefined) {
      if (!dto.depreciationMethod.trim()) {
        throw new BadRequestException("depreciationMethod cannot be empty");
      }
      payload.depreciationMethod = dto.depreciationMethod.trim();
    }

    return this.fixedAssetRepository.update(this.prisma, id, payload);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.fixedAssetRepository.softDelete(this.prisma, id);
  }
}

