import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../../prisma/tenant-prisma-context.service";
import { buildOrderBy, buildSearchFilter } from "../../common/utils/pagination.helper";
import { buildPaginatedResponse } from "../../common/dto/pagination.dto";
import { ProductsQueryDto } from "./dto/products-query.dto";
import { ProductDashboardStats } from "./utils/interfaces";

const PRODUCT_INCLUDE = {
  uom: { select: { id: true, name: true, symbol: true } },
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  productGroup: { select: { id: true, name: true } },
  attributes: {
    select: { id: true, name: true, value: true, unit: true },
    orderBy: { name: "asc" as const },
  },
};

@Injectable()
export class ProductsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data, include: PRODUCT_INCLUDE });
  }

  async findAll(query: ProductsQueryDto) {
    const { search, isActive, type, page = 1, limit = 10, sortBy, sortOrder } = query;

    const where: Prisma.ProductWhereInput = { deletedAt: null };

    if (isActive !== undefined) where.isActive = isActive;
    if (type) where.type = type;
    if (search) where.OR = buildSearchFilter(search, ["name", "code", "description", "barcode"]);

    const orderBy = buildOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({ where, include: PRODUCT_INCLUDE, orderBy, skip, take: limit }),
      this.prisma.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(id: string) {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: PRODUCT_INCLUDE,
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({ where: { id }, data, include: PRODUCT_INCLUDE });
  }

  async softDelete(id: string, updatedById?: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }

  async dropdown() {
    return this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        currentStock: true,
        sellingPrice: true,
        uom: { select: { id: true, name: true, symbol: true } },
      },
    });
  }

  async findByCode(code: string, excludeId?: string | null) {
    return this.prisma.product.findFirst({
      where: { code, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  async findByBarcode(barcode: string, excludeId?: string | null) {
    return this.prisma.product.findFirst({
      where: { barcode, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  async findUomById(id: string) {
    return this.prisma.uOM.findUnique({ where: { id }, select: { id: true } });
  }

  async findCategoryById(id: string) {
    return this.prisma.productCategory.findUnique({ where: { id }, select: { id: true } });
  }

  async findBrandById(id: string) {
    return this.prisma.productBrand.findUnique({ where: { id }, select: { id: true } });
  }

  async findProductGroupById(id: string) {
    return this.prisma.productGroup.findUnique({ where: { id }, select: { id: true } });
  }

  async hasBomReference(id: string): Promise<boolean> {
    const count = await this.prisma.bOM.count({ where: { productId: id, deletedAt: null } });
    return count > 0;
  }

  async hasBlockingReferences(id: string): Promise<boolean> {
    const [bomCount, productionOrderCount, saleItemCount] = await Promise.all([
      this.prisma.bOM.count({ where: { productId: id, deletedAt: null } }),
      this.prisma.productionOrder.count({ where: { productId: id, deletedAt: null } }),
      this.prisma.saleItem.count({ where: { productId: id } }),
    ]);
    return bomCount + productionOrderCount + saleItemCount > 0;
  }

  async toggleActive(id: string, updatedById?: string) {
    const current = await this.prisma.product.findUnique({
      where: { id },
      select: { isActive: true },
    });
    return this.prisma.product.update({
      where: { id },
      data: { isActive: !current?.isActive, updatedById },
      include: PRODUCT_INCLUDE,
    });
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<ProductDashboardStats> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        currentStock: true,
        minStock: true,
        costPrice: true,
      },
    });

    let totalStockValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const product of products) {
      const currentStock = Number(product.currentStock);
      const minStock = Number(product.minStock);
      const costPrice = Number(product.costPrice || 0);

      totalStockValue += currentStock * costPrice;

      if (currentStock <= 0) {
        outOfStockCount++;
      } else if (currentStock <= minStock) {
        lowStockCount++;
      }
    }

    return {
      totalActiveProducts: products.length,
      totalStockValue,
      lowStockCount,
      outOfStockCount,
    };
  }
}
