import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { buildOrderBy, buildSearchFilter } from "../common/utils/pagination.helper";
import { getTotalPages } from "../common/reuseable-functions/getTotalPages";
import { SupplierQueryDto } from "./dto/supplier-query.dto";
import { SupplierDashboardStats } from "./utils/interfaces";

const SUPPLIER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  address: true,
  notes: true,
  isActive: true,
  openingBalanceAmount: true,
  openingBalanceDate: true,
  openingBalanceNote: true,
  openingBalanceSetById: true,
  deletedAt: true,
  createdById: true,
  updatedById: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class SuppliersRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.SupplierCreateInput) {
    return this.prisma.supplier.create({ data, select: SUPPLIER_SELECT });
  }

  async findAll(queryDto: SupplierQueryDto) {
    const { search, isActive, page = 1, limit = 20, sortBy, sortOrder } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = { deletedAt: null };
    if (isActive !== undefined) where.isActive = isActive;
    if (search) where.OR = buildSearchFilter(search, ["name", "email", "phone"]);

    const orderBy = buildOrderBy(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, select: SUPPLIER_SELECT, orderBy, skip, take: limit }),
      this.prisma.supplier.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: getTotalPages(total, limit) },
    };
  }

  async findById(id: string) {
    return this.prisma.supplier.findFirst({
      where: { id, deletedAt: null },
      select: SUPPLIER_SELECT,
    });
  }

  async update(id: string, data: Prisma.SupplierUpdateInput) {
    return this.prisma.supplier.update({ where: { id }, data, select: SUPPLIER_SELECT });
  }

  async softDelete(id: string, updatedById?: string) {
    return this.prisma.supplier.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }

  async toggleActive(id: string, updatedById?: string) {
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: !current?.isActive, updatedById },
      select: SUPPLIER_SELECT,
    });
  }

  async dropdown() {
    return this.prisma.supplier.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  async hasPurchaseOrders(id: string): Promise<boolean> {
    const count = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
    return count > 0;
  }

  // Counts procurement records tying a supplier down. GRNs have no direct
  // supplierId — they reference the supplier through their purchase order.
  async countProcurementLinks(
    id: string,
  ): Promise<{ purchaseOrders: number; grns: number }> {
    const [purchaseOrders, grns] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { supplierId: id } }),
      this.prisma.gRN.count({ where: { purchaseOrder: { supplierId: id } } }),
    ]);
    return { purchaseOrders, grns };
  }

  async findByEmail(email: string, excludeId?: string) {
    return this.prisma.supplier.findFirst({
      where: { email, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  async findByPhone(phone: string, excludeId?: string) {
    return this.prisma.supplier.findFirst({
      where: { phone, deletedAt: null, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<SupplierDashboardStats> {
    const [totalSuppliers, activeSuppliers] = await Promise.all([
      this.prisma.supplier.count({ where: { deletedAt: null } }),
      this.prisma.supplier.count({ where: { deletedAt: null, isActive: true } }),
    ]);

    return {
      totalSuppliers,
      activeSuppliers,
      inactiveSuppliers: totalSuppliers - activeSuppliers,
    };
  }
}
