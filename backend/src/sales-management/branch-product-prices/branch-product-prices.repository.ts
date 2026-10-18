import { Injectable } from "@nestjs/common";
import { DistributionPricingMode, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { BranchProductPriceFiltersDto } from "./dto/branch-product-price-filters.dto";
import { BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE } from "./utils/constants";
import { BranchProductPriceDetail } from "./utils/types";

export interface UpsertBranchProductPriceData {
  sellerBranchId: string | null;
  productId: string;
  price: number;
}

@Injectable()
export class BranchProductPricesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    branchProductPriceFiltersDto: BranchProductPriceFiltersDto,
  ): Promise<PaginatedResponse<BranchProductPriceDetail>> {
    const { sellerBranchId, page = 1, limit = 10 } = branchProductPriceFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    // No sellerBranchId query param means "the Factory's price list" — the
    // Factory has no Branch row of its own, so its rows are the ones where
    // sellerBranchId is null.
    const where: Prisma.BranchProductPriceWhereInput = { sellerBranchId: sellerBranchId ?? null };

    const [data, total] = await Promise.all([
      this.prisma.branchProductPrice.findMany({
        where,
        skip,
        take,
        orderBy: { product: { name: "asc" } },
        include: BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE,
      }),
      this.prisma.branchProductPrice.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  // Prisma's compound-unique upsert only works reliably when sellerBranchId
  // is non-null — a unique index treats every NULL as distinct from every
  // other NULL, so it can never match an existing Factory row. The Factory
  // case (sellerBranchId null) is handled as a manual find-then-write
  // instead. This is admin price-list configuration, not a high-concurrency
  // financial transaction, so the small race window here is an accepted
  // trade-off — unlike stock/ledger writes, which always go through a single
  // atomic transaction.
  async upsert(data: UpsertBranchProductPriceData): Promise<BranchProductPriceDetail> {
    if (data.sellerBranchId === null) {
      const existing = await this.prisma.branchProductPrice.findFirst({
        where: { sellerBranchId: null, productId: data.productId },
      });

      if (existing) {
        return this.prisma.branchProductPrice.update({
          where: { id: existing.id },
          data: { price: data.price },
          include: BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE,
        });
      }

      return this.prisma.branchProductPrice.create({
        data,
        include: BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE,
      });
    }

    return this.prisma.branchProductPrice.upsert({
      where: {
        sellerBranchId_productId: { sellerBranchId: data.sellerBranchId, productId: data.productId },
      },
      create: data,
      update: { price: data.price },
      include: BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE,
    });
  }

  // Used by BranchStockRequests to pre-fill a request item's price. Returns
  // null when the seller hasn't set a standard price for this product yet —
  // callers fall back to requiring the fulfiller to enter one manually.
  async findPrice(sellerBranchId: string | null, productId: string): Promise<number | null> {
    const record = await this.prisma.branchProductPrice.findFirst({
      where: { sellerBranchId, productId },
      select: { price: true },
    });

    return record ? Number(record.price) : null;
  }

  // One Settings row per tenant — PrismaService already scopes to the
  // logged-in tenant, so no tenantId lookup is needed here.
  async getPricingMode(): Promise<DistributionPricingMode> {
    const settings = await this.prisma.settings.findFirst({
      select: { distributionPricingMode: true },
    });

    return settings?.distributionPricingMode ?? DistributionPricingMode.FREE_PRICE;
  }
}
