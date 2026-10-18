import { Injectable } from "@nestjs/common";
import { Customer, CustomerStatus, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomerFiltersDto } from "./dto/customer-filters.dto";
import { CustomerStatsDto } from "./dto/customer-stats.dto";
import { PaginatedResponse, buildPaginatedResponse } from "../../common/dto/pagination.dto";
import { buildSearchFilter, buildOrderBy } from "../../common/utils/pagination.helper";
import { CustomerDashboardStats } from "./utils/interfaces";
import { CUSTOMER_DETAIL_INCLUDE, CUSTOMER_LIST_INCLUDE } from "./utils/constants";
import { CustomerDetail, CustomerListItem } from "./utils/types";

const CUSTOMER_SEARCH_FIELDS = ["shopName", "shopkeeperName", "phone", "cnic", "code"];

@Injectable()
export class CustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateCustomerCode(): Promise<string> {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const last = await this.prisma.customer.findFirst({
      where: { code: { startsWith: `CUST-${dateStr}` } },
      orderBy: { code: "desc" },
    });
    const seq = last ? parseInt(last.code.split("-")[2]) + 1 : 1;
    return `CUST-${dateStr}-${seq.toString().padStart(4, "0")}`;
  }

  async create(data: Prisma.CustomerUncheckedCreateInput): Promise<CustomerDetail> {
    return this.prisma.customer.create({ data, include: CUSTOMER_DETAIL_INCLUDE });
  }

  async findAll(
    customerFiltersDto: CustomerFiltersDto,
  ): Promise<PaginatedResponse<CustomerListItem>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy,
      sortOrder,
      status,
      customerType,
      categoryId,
      areaId,
    } = customerFiltersDto;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    if (search) where.OR = buildSearchFilter(search, CUSTOMER_SEARCH_FIELDS);
    if (status) where.status = status;
    if (customerType) where.customerType = customerType;
    if (categoryId) where.categoryId = categoryId;
    if (areaId) where.areaId = areaId;

    const orderBy = sortBy ? buildOrderBy(sortBy, sortOrder) : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: CUSTOMER_LIST_INCLUDE,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(customerId: string): Promise<CustomerDetail | null> {
    return this.prisma.customer.findUnique({
      where: { id: customerId },
      include: CUSTOMER_DETAIL_INCLUDE,
    });
  }

  async dropdown(): Promise<Pick<Customer, "id" | "shopName" | "code" | "phone">[]> {
    return this.prisma.customer.findMany({
      where: { status: CustomerStatus.ACTIVE },
      orderBy: { shopName: "asc" },
      select: { id: true, shopName: true, code: true, phone: true },
    });
  }

  async update(
    customerId: string,
    data: Prisma.CustomerUncheckedUpdateInput,
  ): Promise<CustomerDetail> {
    return this.prisma.customer.update({
      where: { id: customerId },
      data,
      include: CUSTOMER_DETAIL_INCLUDE,
    });
  }

  async countSales(customerId: string): Promise<number> {
    return this.prisma.sale.count({ where: { customerId } });
  }

  // `Customer.balance` is only maintained by the legacy sales/POS module
  // (see sales.repository.ts / pos.service.ts) — customer-orders/deliveries/
  // returns/recovery never write to it, they only ever add rows to
  // CustomerLedger. So any check for "does this shop owe money" must also
  // look here, or a shop with real outstanding debt on the new distribution
  // flow would show a stale balance of 0.
  async getDistributionLedgerBalance(customerId: string): Promise<number> {
    const { _sum } = await this.prisma.customerLedger.aggregate({
      where: { customerId },
      _sum: { debit: true, credit: true },
    });

    return (_sum.debit ?? 0) - (_sum.credit ?? 0);
  }

  async getStats(customerId: string): Promise<CustomerStatsDto> {
    const [salesStats, lastSale, thisMonthStats] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { customerId, status: "COMPLETED" },
        _count: { id: true },
        _sum: { totalAmount: true, amountPaid: true },
      }),

      this.prisma.sale.findFirst({
        where: { customerId, status: "COMPLETED" },
        orderBy: { saleDate: "desc" },
        select: { saleDate: true },
      }),

      this.prisma.sale.aggregate({
        where: {
          customerId,
          status: "COMPLETED",
          saleDate: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _count: { id: true },
        _sum: { totalAmount: true },
      }),
    ]);

    const totalSales = salesStats._count.id;
    const totalAmount = Number(salesStats._sum.totalAmount ?? 0);
    const totalPaid = Number(salesStats._sum.amountPaid ?? 0);

    return {
      totalSales,
      totalAmount,
      totalPaid,
      outstandingBalance: totalAmount - totalPaid,
      averageSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
      lastSaleDate: lastSale?.saleDate ?? null,
      salesThisMonth: thisMonthStats._count.id,
      amountThisMonth: Number(thisMonthStats._sum.totalAmount ?? 0),
    };
  }

  //–––––––––––––––––––––––––––––––– Dashboard APIs ––––––––––––––––––––––––––––––––

  async getDashboardStats(): Promise<CustomerDashboardStats> {
    const [totalCustomers, activeCustomers, topCustomers] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
      this.prisma.customer.findMany({
        orderBy: { balance: "desc" },
        take: 5,
        select: { id: true, shopName: true, balance: true },
      }),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      topCustomersByBalance: topCustomers.map((customer) => ({
        customerId: customer.id,
        customerName: customer.shopName,
        balance: customer.balance,
      })),
    };
  }

  async getLedgerOverview(search?: string): Promise<any[]> {
    const where: Prisma.CustomerWhereInput = { status: CustomerStatus.ACTIVE };

    if (search) where.OR = buildSearchFilter(search, CUSTOMER_SEARCH_FIELDS);

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        code: true,
        shopName: true,
        email: true,
        phone: true,
        address: true,
      },
      orderBy: { shopName: "asc" },
    });

    if (customers.length === 0) return [];

    const customerIds = customers.map((customer) => customer.id);

    const ledgerAggregates = await this.prisma.customerLedger.groupBy({
      by: ["customerId"],
      where: { customerId: { in: customerIds } },
      _sum: { debit: true, credit: true },
      _max: { date: true },
    });

    const aggregateByCustomerId = new Map(
      ledgerAggregates.map((row) => [
        row.customerId,
        {
          balance: (row._sum.debit ?? 0) - (row._sum.credit ?? 0),
          lastTransactionDate: row._max.date ?? null,
        },
      ]),
    );

    return customers.map((customer) => {
      const aggregate = aggregateByCustomerId.get(customer.id);

      return {
        id: customer.id,
        code: customer.code,
        shopName: customer.shopName,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        balance: aggregate?.balance ?? 0,
        lastTransactionDate: aggregate?.lastTransactionDate ?? null,
      };
    });
  }
}
