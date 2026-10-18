import { Injectable } from "@nestjs/common";
import { Prisma, ProductBrandStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ProductBrandFiltersDto } from "./dto/product-brand-filters.dto";
import { ProductBrandDetail, ProductBrandListItem } from "./utils/types";

const PRODUCT_BRAND_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt"];

@Injectable()
export class ProductBrandRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    productBrandFiltersDto: ProductBrandFiltersDto,
  ): Promise<PaginatedResponse<ProductBrandListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = productBrandFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductBrandWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && PRODUCT_BRAND_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.productBrand.findMany({ where, skip, take, orderBy }),
      this.prisma.productBrand.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.prisma.productBrand.findMany({
      where: { status: ProductBrandStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(productBrandId: string): Promise<ProductBrandDetail | null> {
    return this.prisma.productBrand.findUnique({ where: { id: productBrandId } });
  }

  async create(data: Prisma.ProductBrandCreateInput): Promise<ProductBrandDetail> {
    return this.prisma.productBrand.create({ data });
  }

  async update(
    productBrandId: string,
    data: Prisma.ProductBrandUpdateInput,
  ): Promise<ProductBrandDetail> {
    return this.prisma.productBrand.update({ where: { id: productBrandId }, data });
  }

  async delete(productBrandId: string): Promise<void> {
    await this.prisma.productBrand.delete({ where: { id: productBrandId } });
  }

  async hasProductsReferencing(productBrandId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { brandId: productBrandId, deletedAt: null },
    });
    return count > 0;
  }
}
