import { Injectable } from "@nestjs/common";
import { Prisma, CustomerCategoryStatus } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { CustomerCategoryFiltersDto } from "./dto/customer-category-filters.dto";
import { CustomerCategoryDetail, CustomerCategoryListItem } from "./utils/types";

const CUSTOMER_CATEGORY_SORTABLE_FIELDS = ["name", "status", "createdAt", "updatedAt"];

@Injectable()
export class CustomerCategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    customerCategoryFiltersDto: CustomerCategoryFiltersDto,
  ): Promise<PaginatedResponse<CustomerCategoryListItem>> {
    const { search, status, sortBy, sortOrder, page = 1, limit = 10 } = customerCategoryFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.CustomerCategoryWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (status) where.status = status;

    const orderBy =
      sortBy && CUSTOMER_CATEGORY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customerCategory.findMany({ where, skip, take, orderBy }),
      this.prisma.customerCategory.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; name: string }[]> {
    return this.prisma.customerCategory.findMany({
      where: { status: CustomerCategoryStatus.ACTIVE },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(customerCategoryId: string): Promise<CustomerCategoryDetail | null> {
    return this.prisma.customerCategory.findUnique({ where: { id: customerCategoryId } });
  }

  async create(data: Prisma.CustomerCategoryCreateInput): Promise<CustomerCategoryDetail> {
    return this.prisma.customerCategory.create({ data });
  }

  async update(
    customerCategoryId: string,
    data: Prisma.CustomerCategoryUpdateInput,
  ): Promise<CustomerCategoryDetail> {
    return this.prisma.customerCategory.update({ where: { id: customerCategoryId }, data });
  }

  async delete(customerCategoryId: string): Promise<void> {
    await this.prisma.customerCategory.delete({ where: { id: customerCategoryId } });
  }

  async hasCustomersReferencing(customerCategoryId: string): Promise<boolean> {
    const count = await this.prisma.customer.count({ where: { categoryId: customerCategoryId } });
    return count > 0;
  }
}
