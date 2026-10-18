import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class FixedAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      assetName: string;
      cost: number;
      usefulLife: number;
      depreciationMethod: string;
      bookValue: number;
    },
  ) {
    return tx.fixedAsset.create({
      data: {
        assetName: data.assetName,
        cost: data.cost,
        usefulLife: data.usefulLife,
        depreciationMethod: data.depreciationMethod,
        bookValue: data.bookValue,
      },
    });
  }

  listDepreciableAssets(tx: any) {
    return tx.fixedAsset.findMany({
      where: {
        deletedAt: null,
        bookValue: { gt: 0 },
      },
    });
  }

  findAll(tx: any) {
    return tx.fixedAsset.findMany({
      where: { deletedAt: null },
      include: { depreciationEntries: true },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(tx: any, id: string) {
    return tx.fixedAsset.findFirst({
      where: { id, deletedAt: null },
      include: { depreciationEntries: true },
    });
  }

  updateBookValue(tx: any, assetId: string, bookValue: number) {
    return tx.fixedAsset.update({
      where: { id: assetId },
      data: { bookValue },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{
      assetName: string;
      usefulLife: number;
      depreciationMethod: string;
    }>,
  ) {
    return tx.fixedAsset.update({
      where: { id },
      data,
    });
  }

  softDelete(tx: any, id: string) {
    return tx.fixedAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

