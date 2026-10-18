import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditAction, PriceListEntry } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { ProductsService } from "../../product-management/products/products.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../audit/audit.service";
import { AuditContextService } from "../../audit/audit-context.service";
import { PriceListsRepository } from "./price-lists.repository";
import { UpsertPriceListEntryDto } from "./dto/upsert-price-list-entry.dto";
import { PriceListFiltersDto } from "./dto/price-list-filters.dto";
import { ProductPriceListEntry } from "./utils/types";
import { PriceListTier } from "./utils/enums";

const PRICE_LIST_ENTRY_ENTITY_NAME = "PriceListEntry";

@Injectable()
export class PriceListsService {
  constructor(
    private readonly priceListsRepository: PriceListsRepository,
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listPriceListEntries(
    priceListFiltersDto: PriceListFiltersDto,
  ): Promise<PaginatedResponse<ProductPriceListEntry>> {
    return this.priceListsRepository.findAll(priceListFiltersDto);
  }

  // History for exactly one tier of one product — each tier is a separate
  // PriceListEntry row with its own audit trail, so this never mixes in
  // another tier's changes.
  async getProductPriceHistory(productId: string, tier: PriceListTier) {
    await this.productsService.findOne(productId);
    const entryId = await this.priceListsRepository.findEntryId(tier, productId);

    if (!entryId) return [];

    return this.auditService.findByEntity(this.prisma, PRICE_LIST_ENTRY_ENTITY_NAME, entryId);
  }

  // This route is POST regardless of whether it's setting a tier's price for
  // the first time or changing an existing one, so the audit interceptor
  // would otherwise always log it as a false CREATE with a null oldValue.
  // Reading the existing row first lets us tell the interceptor the truth.
  async upsertPriceListEntry(
    upsertPriceListEntryDto: UpsertPriceListEntryDto,
  ): Promise<PriceListEntry> {
    const { tier, productId, price } = upsertPriceListEntryDto;

    await this.productsService.findOne(productId);

    const existingEntry = await this.priceListsRepository.findEntry(tier, productId);
    if (existingEntry) {
      this.auditContext.setAction(AuditAction.UPDATE);
      this.auditContext.setEntityId(existingEntry.id);
      // Prisma returns `price` as a Decimal — the response pipeline normally
      // converts that to a plain number before it's logged, but this snapshot
      // is read directly here and never passes through that pipeline, so it
      // has to be converted by hand or it round-trips into the log as a string.
      this.auditContext.setOldValue({ ...existingEntry, price: Number(existingEntry.price) });
    }

    return this.priceListsRepository.upsert(tier, productId, price);
  }

  // The single place FIXED_PRICE mode looks up "what does this actually
  // cost" — used by both branch-to-branch stock pricing and customer order
  // pricing, so a price list entry only ever needs to be set once.
  async getPrice(tier: PriceListTier, productId: string): Promise<number> {
    const price = await this.priceListsRepository.findPrice(tier, productId);

    if (price === null) {
      throw new BadRequestException(
        `No ${tier} price has been set for this product yet — ask Finance/Admin to add one`,
      );
    }

    return price;
  }
}
