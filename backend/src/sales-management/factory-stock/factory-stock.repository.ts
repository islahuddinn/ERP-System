import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { FactoryStockFiltersDto } from "./dto/factory-stock-filters.dto";
import { FACTORY_STOCK_BALANCE_INCLUDE } from "./utils/constants";
import { FactoryStockBalanceDetail } from "./utils/types";

@Injectable()
export class FactoryStockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    factoryStockFiltersDto: FactoryStockFiltersDto,
  ): Promise<PaginatedResponse<FactoryStockBalanceDetail>> {
    const { productId, page = 1, limit = 10 } = factoryStockFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.FactoryStockBalanceWhereInput = {
      ...(productId && { productId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.factoryStockBalance.findMany({
        where,
        skip,
        take,
        orderBy: { product: { name: "asc" } },
        include: FACTORY_STOCK_BALANCE_INCLUDE,
      }),
      this.prisma.factoryStockBalance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findByProductId(productId: string): Promise<FactoryStockBalanceDetail | null> {
    return this.prisma.factoryStockBalance.findUnique({
      where: { productId },
      include: FACTORY_STOCK_BALANCE_INCLUDE,
    });
  }

  // Always positive — upserts because the product may be entering factory
  // stock for the first time and has no balance row yet.
  async stockIn(productId: string, quantity: number): Promise<FactoryStockBalanceDetail> {
    await this.increment(productId, quantity);
    return this.findByProductId(productId) as Promise<FactoryStockBalanceDetail>;
  }

  // Signed correction — positive delta behaves exactly like stockIn, negative
  // delta goes through the same atomic check-and-decrement as `decrement`.
  // The service only calls this once it has confirmed a balance row already
  // exists (see FactoryStockService.checkExistence).
  async adjust(productId: string, delta: number): Promise<FactoryStockBalanceDetail> {
    if (delta > 0) {
      await this.increment(productId, delta);
    } else {
      await this.decrement(productId, -delta);
    }

    return this.findByProductId(productId) as Promise<FactoryStockBalanceDetail>;
  }

  // `tx` defaults to the plain PrismaService for standalone calls (stockIn /
  // adjust above) and is passed explicitly as the transaction client when
  // called from BranchStockTransfersRepository.dispatch() — same dual-use
  // shape as BranchStockRepository, minus the branchId dimension.
  async increment(
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.factoryStockBalance.upsert({
      where: { productId },
      create: { productId, quantity },
      update: { quantity: { increment: quantity } },
    });
  }

  // The `quantity: { gte: quantity }` guard makes this an atomic
  // check-and-decrement — a correction or a transfer dispatch can never
  // drive the Factory's balance negative.
  async decrement(
    productId: string,
    quantity: number,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    const result = await tx.factoryStockBalance.updateMany({
      where: { productId, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });

    if (result.count === 0) {
      throw new BadRequestException("Insufficient stock at the Factory for this quantity");
    }
  }
}
