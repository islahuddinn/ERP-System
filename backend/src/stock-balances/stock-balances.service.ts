import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { PaginationDto } from "../common/dto/pagination.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";

@Injectable()
export class StockBalancesService {
  private getPrisma(tenantClient?: PrismaClient | Prisma.TransactionClient) {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for stock balance operations");
    }

    return tenantClient;
  }

  async findAll(
    tenantClient: PrismaClient,
    paginationDto: PaginationDto,
    productId?: string,
    locationId?: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const { page = 1, limit = 10 } = paginationDto;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const { skip, take } = getPaginationParams(pageNumber, limitNumber);

    const where: any = {};

    if (productId) {
      where.productId = productId;
    }

    if (locationId) {
      where.locationId = locationId;
    }

    const [stockBalances, total] = await Promise.all([
      prisma.stockBalance.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              sellingPrice: true,
              uom: {
                select: {
                  symbol: true,
                },
              },
              reorderLevel: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ product: { name: "asc" } }, { location: { name: "asc" } }],
        skip,
        take,
      }),
      prisma.stockBalance.count({ where }),
    ]);

    return createPaginatedResponse(stockBalances, total, pageNumber, limitNumber);
  }

  async findOne(tenantClient: PrismaClient, productId: string, locationId: string) {
    const prisma = this.getPrisma(tenantClient);
    return prisma.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            uom: {
              select: {
                symbol: true,
              },
            },
            reorderLevel: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getReorderAlerts(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);
    // Get all stock balances with their products
    const stockBalances = await prisma.stockBalance.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            uom: {
              select: {
                symbol: true,
              },
            },
            reorderLevel: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { location: { name: "asc" } }],
    });

    // Filter balances where quantity is less than reorder level
    return stockBalances.filter((balance) => balance.quantity < balance.product.reorderLevel);
  }

  async getTotalStock(tenantClient: PrismaClient, productId: string) {
    const prisma = this.getPrisma(tenantClient);
    const balances = await prisma.stockBalance.findMany({
      where: { productId },
    });

    return balances.reduce((total, balance) => total + balance.quantity, 0);
  }

  async getLocationStock(tenantClient: PrismaClient, locationId: string) {
    const prisma = this.getPrisma(tenantClient);

    return prisma.stockBalance.findMany({
      where: { locationId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            uom: {
              select: {
                symbol: true,
              },
            },
            reorderLevel: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { product: { name: "asc" } },
    });
  }

  async getTotalInventoryCost(tenantClient: PrismaClient): Promise<number> {
    const prisma = this.getPrisma(tenantClient);

    // Get all stock balances with product cost prices
    const stockBalances = await prisma.stockBalance.findMany({
      include: {
        product: {
          select: {
            sellingPrice: true,
          },
        },
      },
    });

    // Calculate total: sum of (costPrice * quantity) for all balances
    const totalCost = stockBalances.reduce((sum, balance) => {
      const sellingPrice = Number(balance.product?.sellingPrice || 0);
      const quantity = Number(balance.quantity || 0);
      return sum + sellingPrice * quantity;
    }, 0);

    return totalCost;
  }

  async getLocationWiseInventoryCost(
    tenantClient: PrismaClient,
  ): Promise<Array<{ locationId: string; locationName: string; totalCost: number }>> {
    const prisma = this.getPrisma(tenantClient);

    // Get all stock balances with product cost prices and location info
    const stockBalances = await prisma.stockBalance.findMany({
      include: {
        product: {
          select: {
            sellingPrice: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Group by location and calculate total cost per location
    const locationCosts = new Map<string, { locationName: string; totalCost: number }>();

    stockBalances.forEach((balance) => {
      const locationId = balance.locationId;
      const locationName = balance.location.name;
      const sellingPrice = Number(balance.product?.sellingPrice || 0);
      const quantity = Number(balance.quantity || 0);
      const itemCost = sellingPrice * quantity;

      if (!locationCosts.has(locationId)) {
        locationCosts.set(locationId, { locationName, totalCost: 0 });
      }

      const current = locationCosts.get(locationId)!;
      current.totalCost += itemCost;
    });

    // Convert to array format
    return Array.from(locationCosts.entries()).map(([locationId, data]) => ({
      locationId,
      locationName: data.locationName,
      totalCost: data.totalCost,
    }));
  }
}
