import { Injectable } from "@nestjs/common";
import { Prisma, PriceListEntry, PriceListTier } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { getPaginationParams } from "../../common/utils/pagination.helper";
import { PriceListFiltersDto } from "./dto/price-list-filters.dto";
import { PRODUCT_PRICE_LIST_SELECT } from "./utils/constants";
import { ProductPriceListEntry, ProductWithPriceListEntries } from "./utils/types";

@Injectable()
export class PriceListsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // One row per product (only products with at least one tier priced),
  // each carrying all 4 tiers nested underneath.
  async findAll(
    priceListFiltersDto: PriceListFiltersDto,
  ): Promise<PaginatedResponse<ProductPriceListEntry>> {
    const { page = 1, limit = 10 } = priceListFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductWhereInput = { priceListEntries: { some: {} } };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: "asc" },
        select: PRODUCT_PRICE_LIST_SELECT,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = products.map((product) => this.groupProductPrices(product));

    return buildPaginatedResponse(data, total, page, limit);
  }

  // The entry ID for one (tier, product) pair — used to look up that single
  // tier's audit history. Null when nobody has priced this tier yet.
  async findEntryId(tier: PriceListTier, productId: string): Promise<string | null> {
    const entry = await this.prisma.priceListEntry.findUnique({
      where: { tier_productId: { tier, productId } },
      select: { id: true },
    });

    return entry?.id ?? null;
  }

  // The full existing row for one (tier, product) pair, if any — read before
  // an upsert so the caller can capture it as the audit oldValue when the
  // upsert turns out to be an update rather than a first-time create.
  async findEntry(tier: PriceListTier, productId: string): Promise<PriceListEntry | null> {
    return this.prisma.priceListEntry.findUnique({
      where: { tier_productId: { tier, productId } },
    });
  }

  // One row per (tier, product), so setting a price for a tier that already
  // has one just updates it — there's never a second row to clean up. No
  // product include here: the audit interceptor logs whatever this returns,
  // and a price entry's own fields (tier, price) are all that's relevant —
  // nesting the product would just bloat every price-change log entry.
  async upsert(tier: PriceListTier, productId: string, price: number): Promise<PriceListEntry> {
    return this.prisma.priceListEntry.upsert({
      where: { tier_productId: { tier, productId } },
      create: { tier, productId, price },
      update: { price },
    });
  }

  // The one method everything else in FIXED_PRICE mode calls to find out
  // what something actually costs. Returns null when nobody has set a price
  // for this tier + product yet, so the caller can fail with a clear message
  // instead of silently charging $0.
  async findPrice(tier: PriceListTier, productId: string): Promise<number | null> {
    const entry = await this.prisma.priceListEntry.findUnique({
      where: { tier_productId: { tier, productId } },
      select: { price: true },
    });

    return entry ? Number(entry.price) : null;
  }

  private groupProductPrices(product: ProductWithPriceListEntries): ProductPriceListEntry {
    const entryByTier = Object.fromEntries(
      product.priceListEntries.map((entry) => [
        entry.tier,
        { id: entry.id, price: Number(entry.price), updatedAt: entry.updatedAt },
      ]),
    );

    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      prices: {
        factoryPrice: entryByTier[PriceListTier.FACTORY_PRICE] ?? null,
        distributorPrice: entryByTier[PriceListTier.DISTRIBUTOR_PRICE] ?? null,
        tradePrice: entryByTier[PriceListTier.TRADE_PRICE] ?? null,
        mrp: entryByTier[PriceListTier.MRP] ?? null,
      },
    };
  }
}
