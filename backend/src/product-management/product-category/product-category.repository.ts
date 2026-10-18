import { Injectable } from "@nestjs/common";
import { Prisma, ProductCategoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ProductCategoryFiltersDto } from "./dto/product-category-filters.dto";
import { ProductCategoryDetail, ProductCategoryListItem } from "./utils/types";

const PRODUCT_CATEGORY_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt"];

@Injectable()
export class ProductCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    productCategoryFiltersDto: ProductCategoryFiltersDto,
  ): Promise<PaginatedResponse<ProductCategoryListItem>> {
    const {
      search,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = productCategoryFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductCategoryWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && PRODUCT_CATEGORY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.productCategory.findMany({ where, skip, take, orderBy }),
      this.prisma.productCategory.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.prisma.productCategory.findMany({
      where: { status: ProductCategoryStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(productCategoryId: string): Promise<ProductCategoryDetail | null> {
    return this.prisma.productCategory.findUnique({ where: { id: productCategoryId } });
  }

  async create(data: Prisma.ProductCategoryCreateInput): Promise<ProductCategoryDetail> {
    return this.prisma.productCategory.create({ data });
  }

  async update(
    productCategoryId: string,
    data: Prisma.ProductCategoryUpdateInput,
  ): Promise<ProductCategoryDetail> {
    return this.prisma.productCategory.update({ where: { id: productCategoryId }, data });
  }

  async delete(productCategoryId: string): Promise<void> {
    await this.prisma.productCategory.delete({ where: { id: productCategoryId } });
  }

  async hasProductsReferencing(productCategoryId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { categoryId: productCategoryId, deletedAt: null },
    });
    return count > 0;
  }
}
