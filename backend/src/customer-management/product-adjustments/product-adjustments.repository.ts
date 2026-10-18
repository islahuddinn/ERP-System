import { Injectable } from "@nestjs/common";
import { Prisma, ProductAdjustmentType } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter, getPaginationParams } from "../../common/utils/pagination.helper";
import { ProductAdjustmentFiltersDto } from "./dto/product-adjustment-filters.dto";
import {
  PRODUCT_ADJUSTMENT_DETAIL_INCLUDE,
  PRODUCT_ADJUSTMENT_LIST_INCLUDE,
} from "./utils/constants";
import { ProductAdjustmentDetail } from "./utils/types";

const PRODUCT_ADJUSTMENT_SORTABLE_FIELDS = ["adjustedAt", "createdAt", "quantity"];

export interface CreateProductAdjustmentData {
  customerId: string;
  productId: string;
  type: ProductAdjustmentType;
  quantity: number;
  reason: string;
  notes: string | null;
  createdById: string;
}

@Injectable()
export class ProductAdjustmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private serializeDetail(row: Prisma.ProductAdjustmentGetPayload<{
    include: typeof PRODUCT_ADJUSTMENT_DETAIL_INCLUDE;
  }>): ProductAdjustmentDetail {
    return {
      ...row,
      quantity: Number(row.quantity),
    };
  }

  async findAll(
    productAdjustmentFiltersDto: ProductAdjustmentFiltersDto,
  ): Promise<PaginatedResponse<ProductAdjustmentDetail>> {
    const { customerId, productId, type, search, sortBy, sortOrder, page = 1, limit = 10 } =
      productAdjustmentFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.ProductAdjustmentWhereInput = {
      ...(customerId && { customerId }),
      ...(productId && { productId }),
      ...(type && { type }),
    };

    if (search) {
      where.OR = buildSearchFilter(search, ["adjustmentNumber", "reason"]);
    }

    const orderBy =
      sortBy && PRODUCT_ADJUSTMENT_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { adjustedAt: "desc" as const };

    const [rows, total] = await Promise.all([
      this.prisma.productAdjustment.findMany({
        where,
        skip,
        take,
        orderBy,
        include: PRODUCT_ADJUSTMENT_LIST_INCLUDE,
      }),
      this.prisma.productAdjustment.count({ where }),
    ]);

    return buildPaginatedResponse(rows.map((row) => this.serializeDetail(row)), total, page, limit);
  }

  async findById(adjustmentId: string): Promise<ProductAdjustmentDetail | null> {
    const row = await this.prisma.productAdjustment.findUnique({
      where: { id: adjustmentId },
      include: PRODUCT_ADJUSTMENT_DETAIL_INCLUDE,
    });

    return row ? this.serializeDetail(row) : null;
  }

  async findExistingProductId(productId: string): Promise<boolean> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: { id: true },
    });
    return Boolean(product);
  }

  private async generateAdjustmentNumber(tx: Prisma.TransactionClient): Promise<string> {
    const latest = await tx.productAdjustment.findFirst({
      orderBy: { adjustmentNumber: "desc" },
      select: { adjustmentNumber: true },
    });
    const next = latest ? parseInt(latest.adjustmentNumber.replace("PA-", ""), 10) + 1 : 1;
    return `PA-${String(next).padStart(6, "0")}`;
  }

  async create(data: CreateProductAdjustmentData): Promise<ProductAdjustmentDetail> {
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('product_adjustment_number'))`;
      const adjustmentNumber = await this.generateAdjustmentNumber(tx);

      return tx.productAdjustment.create({
        data: {
          adjustmentNumber,
          customerId: data.customerId,
          productId: data.productId,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          notes: data.notes,
          createdById: data.createdById,
        },
        include: PRODUCT_ADJUSTMENT_DETAIL_INCLUDE,
      });
    });

    return this.serializeDetail(row);
  }
}
