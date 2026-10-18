import { Injectable } from "@nestjs/common";
import { Prisma, ProductGroupStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ProductGroupFiltersDto } from "./dto/product-group-filters.dto";
import { ProductGroupDetail, ProductGroupListItem } from "./utils/types";

const PRODUCT_GROUP_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt"];

@Injectable()
export class ProductGroupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    productGroupFiltersDto: ProductGroupFiltersDto,
  ): Promise<PaginatedResponse<ProductGroupListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = productGroupFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductGroupWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && PRODUCT_GROUP_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.productGroup.findMany({ where, skip, take, orderBy }),
      this.prisma.productGroup.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.prisma.productGroup.findMany({
      where: { status: ProductGroupStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(productGroupId: string): Promise<ProductGroupDetail | null> {
    return this.prisma.productGroup.findUnique({ where: { id: productGroupId } });
  }

  async create(data: Prisma.ProductGroupCreateInput): Promise<ProductGroupDetail> {
    return this.prisma.productGroup.create({ data });
  }

  async update(
    productGroupId: string,
    data: Prisma.ProductGroupUpdateInput,
  ): Promise<ProductGroupDetail> {
    return this.prisma.productGroup.update({ where: { id: productGroupId }, data });
  }

  async delete(productGroupId: string): Promise<void> {
    await this.prisma.productGroup.delete({ where: { id: productGroupId } });
  }

  async hasProductsReferencing(productGroupId: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { productGroupId, deletedAt: null },
    });
    return count > 0;
  }

  async hasBranchesReferencing(productGroupId: string): Promise<boolean> {
    const count = await this.prisma.branch.count({
      where: { productGroupIds: { has: productGroupId } },
    });
    return count > 0;
  }
}
