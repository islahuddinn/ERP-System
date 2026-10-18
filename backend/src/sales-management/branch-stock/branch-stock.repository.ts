import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchStockFiltersDto } from "./dto/branch-stock-filters.dto";
import { BRANCH_STOCK_BALANCE_INCLUDE } from "./utils/constants";
import { BranchStockBalanceDetail } from "./utils/types";

@Injectable()
export class BranchStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    branchStockFiltersDto: BranchStockFiltersDto,
  ): Promise<PaginatedResponse<BranchStockBalanceDetail>> {
    const { branchId, productId, page = 1, limit = 10 } = branchStockFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.BranchStockBalanceWhereInput = {
      ...(branchId && { branchId }),
      ...(productId && { productId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.branchStockBalance.findMany({
        where,
        skip,
        take,
        orderBy: { product: { name: "asc" } },
        include: BRANCH_STOCK_BALANCE_INCLUDE,
      }),
      this.prisma.branchStockBalance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // Both increment and decrement always run inside the caller's own
  // transaction (a BranchStockTransfer moving to DISPATCHED/RECEIVED) — see
  // BranchStockTransfersRepository — never called standalone.

  // Upserts because the destination branch may be receiving this product for
  // the first time and has no BranchStockBalance row yet.
  async increment(
    branchId: string,
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.branchStockBalance.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  // The `quantity: { gte: quantity } ` guard makes this an atomic
  // check-and-decrement — if two dispatches race for the same branch's last
  // few units, only the one(s) that still fit succeed; the rest see
  // count === 0 and fail cleanly instead of driving the balance negative.
  async decrement(
    branchId: string,
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const result = await tx.branchStockBalance.updateMany({
      where: { branchId, productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    if (result.count === 0) {
      throw new BadRequestException(
        "Insufficient stock at the source branch to dispatch this quantity",
      );
    }
  }
}
