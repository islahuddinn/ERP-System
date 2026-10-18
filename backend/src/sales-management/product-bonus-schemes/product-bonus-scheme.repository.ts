import { Injectable } from "@nestjs/common";
import { Prisma, ProductBonusSchemeStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ProductBonusSchemeFiltersDto } from "./dto/product-bonus-scheme-filters.dto";
import {
  PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE,
  PRODUCT_BONUS_SCHEME_LIST_INCLUDE,
} from "./utils/constants";
import { ProductBonusSchemeDetail, ProductBonusSchemeListItem } from "./utils/types";

const PRODUCT_BONUS_SCHEME_SORTABLE_FIELDS = [
  "code",
  "name",
  "validFrom",
  "validTo",
  "status",
  "createdAt",
  "updatedAt",
];

type ProductBonusSchemeRow = Prisma.ProductBonusSchemeGetPayload<{
  include: typeof PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE;
}>;

@Injectable()
export class ProductBonusSchemeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private serializeScheme(row: ProductBonusSchemeRow): ProductBonusSchemeListItem {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      productBonusGroupId: row.productBonusGroupId,
      type: row.type,
      minPurchaseQty: Number(row.minPurchaseQty),
      bonusQty: Number(row.bonusQty),
      validFrom: row.validFrom,
      validTo: row.validTo,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      productBonusGroup: {
        id: row.productBonusGroup.id,
        code: row.productBonusGroup.code,
        name: row.productBonusGroup.name,
        status: row.productBonusGroup.status,
        productCount: row.productBonusGroup._count.products,
      },
    };
  }

  async findAll(
    productBonusSchemeFiltersDto: ProductBonusSchemeFiltersDto,
  ): Promise<PaginatedResponse<ProductBonusSchemeListItem>> {
    const { search, status, productBonusGroupId, sortBy, sortOrder, page = 1, limit = 10 } =
      productBonusSchemeFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductBonusSchemeWhereInput = {};

    if (status) where.status = status;
    if (productBonusGroupId) where.productBonusGroupId = productBonusGroupId;
    if (search) {
      where.OR = buildSearchFilter(search, ["code", "name", "description"]);
    }

    const orderBy =
      sortBy && PRODUCT_BONUS_SCHEME_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { validFrom: "desc" as const };

    const [rows, total] = await Promise.all([
      this.prisma.productBonusScheme.findMany({
        where,
        skip,
        take,
        orderBy,
        include: PRODUCT_BONUS_SCHEME_LIST_INCLUDE,
      }),
      this.prisma.productBonusScheme.count({ where }),
    ]);

    return buildPaginatedResponse(rows.map((row) => this.serializeScheme(row)), total, page, limit);
  }

  async dropdown(): Promise<
    { id: string; code: string; name: string; productBonusGroupId: string }[]
  > {
    return this.prisma.productBonusScheme.findMany({
      where: { status: ProductBonusSchemeStatus.ACTIVE },
      select: {
        id: true,
        code: true,
        name: true,
        productBonusGroupId: true,
      },
      orderBy: { name: "asc" },
    });
  }

  async findById(productBonusSchemeId: string): Promise<ProductBonusSchemeDetail | null> {
    const row = await this.prisma.productBonusScheme.findUnique({
      where: { id: productBonusSchemeId },
      include: PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE,
    });

    return row ? this.serializeScheme(row) : null;
  }

  async bonusGroupExists(productBonusGroupId: string): Promise<boolean> {
    const group = await this.prisma.productBonusGroup.findUnique({
      where: { id: productBonusGroupId },
      select: { id: true },
    });
    return Boolean(group);
  }

  async create(data: Prisma.ProductBonusSchemeCreateInput): Promise<ProductBonusSchemeDetail> {
    const row = await this.prisma.productBonusScheme.create({
      data,
      include: PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE,
    });
    return this.serializeScheme(row);
  }

  async update(
    productBonusSchemeId: string,
    data: Prisma.ProductBonusSchemeUpdateInput,
  ): Promise<ProductBonusSchemeDetail> {
    const row = await this.prisma.productBonusScheme.update({
      where: { id: productBonusSchemeId },
      data,
      include: PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE,
    });
    return this.serializeScheme(row);
  }

  async delete(productBonusSchemeId: string): Promise<void> {
    await this.prisma.productBonusScheme.delete({ where: { id: productBonusSchemeId } });
  }

  async hasSchemesReferencingGroup(productBonusGroupId: string): Promise<boolean> {
    const count = await this.prisma.productBonusScheme.count({
      where: { productBonusGroupId },
    });
    return count > 0;
  }
}
