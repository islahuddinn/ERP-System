import { Injectable } from "@nestjs/common";
import { Prisma, ProductBonusGroupStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ProductBonusGroupFiltersDto } from "./dto/product-bonus-group-filters.dto";
import {
  PRODUCT_BONUS_GROUP_DETAIL_INCLUDE,
  PRODUCT_BONUS_GROUP_LIST_INCLUDE,
} from "./utils/constants";
import { ProductBonusGroupDetail, ProductBonusGroupListItem } from "./utils/types";

const PRODUCT_BONUS_GROUP_SORTABLE_FIELDS = ["code", "name", "status", "createdAt", "updatedAt"];

type ProductBonusGroupListRow = Prisma.ProductBonusGroupGetPayload<{
  include: typeof PRODUCT_BONUS_GROUP_LIST_INCLUDE;
}>;

type ProductBonusGroupDetailRow = Prisma.ProductBonusGroupGetPayload<{
  include: typeof PRODUCT_BONUS_GROUP_DETAIL_INCLUDE;
}>;

export interface CreateProductBonusGroupData {
  code: string;
  name: string;
  description?: string | null;
  status?: ProductBonusGroupStatus;
  productIds: string[];
}

export interface UpdateProductBonusGroupData {
  code?: string;
  name?: string;
  description?: string | null;
  status?: ProductBonusGroupStatus;
  productIds?: string[];
}

@Injectable()
export class ProductBonusGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  private serializeListItem(row: ProductBonusGroupListRow): ProductBonusGroupListItem {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
      productCount: row._count.products,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private serializeDetail(row: ProductBonusGroupDetailRow): ProductBonusGroupDetail {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      status: row.status,
      productCount: row.products.length,
      products: row.products.map((entry) => entry.product),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async findAll(
    productBonusGroupFiltersDto: ProductBonusGroupFiltersDto,
  ): Promise<PaginatedResponse<ProductBonusGroupListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = productBonusGroupFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductBonusGroupWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["code", "name", "description"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && PRODUCT_BONUS_GROUP_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [rows, total] = await Promise.all([
      this.prisma.productBonusGroup.findMany({
        where,
        skip,
        take,
        orderBy,
        include: PRODUCT_BONUS_GROUP_LIST_INCLUDE,
      }),
      this.prisma.productBonusGroup.count({ where }),
    ]);

    return buildPaginatedResponse(rows.map((row) => this.serializeListItem(row)), total, page, limit);
  }

  async dropdown(): Promise<{ id: string; code: string; name: string }[]> {
    return this.prisma.productBonusGroup.findMany({
      where: { status: ProductBonusGroupStatus.ACTIVE },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(productBonusGroupId: string): Promise<ProductBonusGroupDetail | null> {
    const row = await this.prisma.productBonusGroup.findUnique({
      where: { id: productBonusGroupId },
      include: PRODUCT_BONUS_GROUP_DETAIL_INCLUDE,
    });

    return row ? this.serializeDetail(row) : null;
  }

  async findExistingProductIds(productIds: string[]): Promise<string[]> {
    const uniqueProductIds = [...new Set(productIds)];

    if (!uniqueProductIds.length) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueProductIds }, deletedAt: null },
      select: { id: true },
    });

    return products.map((product) => product.id);
  }

  async create(data: CreateProductBonusGroupData): Promise<ProductBonusGroupDetail> {
    const uniqueProductIds = [...new Set(data.productIds)];

    const row = await this.prisma.$transaction(async (tx) =>
      tx.productBonusGroup.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          status: data.status ?? ProductBonusGroupStatus.ACTIVE,
          products: {
            create: uniqueProductIds.map((productId) => ({ productId })),
          },
        },
        include: PRODUCT_BONUS_GROUP_DETAIL_INCLUDE,
      }),
    );

    return this.serializeDetail(row);
  }

  async update(
    productBonusGroupId: string,
    data: UpdateProductBonusGroupData,
  ): Promise<ProductBonusGroupDetail> {
    const { productIds, ...groupFields } = data;

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.productBonusGroup.update({
        where: { id: productBonusGroupId },
        data: {
          ...(groupFields.code !== undefined && { code: groupFields.code }),
          ...(groupFields.name !== undefined && { name: groupFields.name }),
          ...(groupFields.description !== undefined && { description: groupFields.description }),
          ...(groupFields.status !== undefined && { status: groupFields.status }),
        },
      });

      if (productIds !== undefined) {
        const uniqueProductIds = [...new Set(productIds)];

        await tx.productBonusGroupProduct.deleteMany({ where: { productBonusGroupId } });

        if (uniqueProductIds.length) {
          await tx.productBonusGroupProduct.createMany({
            data: uniqueProductIds.map((productId) => ({
              productBonusGroupId,
              productId,
            })),
          });
        }
      }

      return tx.productBonusGroup.findUniqueOrThrow({
        where: { id: productBonusGroupId },
        include: PRODUCT_BONUS_GROUP_DETAIL_INCLUDE,
      });
    });

    return this.serializeDetail(row);
  }

  async delete(productBonusGroupId: string): Promise<void> {
    await this.prisma.productBonusGroup.delete({ where: { id: productBonusGroupId } });
  }

  async hasSchemesReferencing(productBonusGroupId: string): Promise<boolean> {
    const count = await this.prisma.productBonusScheme.count({
      where: { productBonusGroupId },
    });
    return count > 0;
  }
}
