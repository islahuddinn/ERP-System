import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { StockLedgerService } from "../common/services/stock-ledger.service";
import { CreateStocktakeDto } from "./dto/create-stocktake.dto";
import { UpdateStocktakeDto } from "./dto/update-stocktake.dto";
import { PaginationDto } from "../common/dto/pagination.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";
import { TransactionType } from "@prisma/tenant-client";

@Injectable()
export class StocktakeService {
  private readonly logger = new Logger(StocktakeService.name);

  constructor(private readonly stockLedgerService: StockLedgerService) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for stocktake operations");
    }

    return tenantClient;
  }

  async create(tenantClient: PrismaClient, createStocktakeDto: CreateStocktakeDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const { productId, locationId, warehouseId, zoneId, countedQuantity, remarks } =
      createStocktakeDto;

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Validate location or warehouse
    if (locationId) {
      const location = await prisma.location.findUnique({
        where: { id: locationId },
      });
      if (!location) {
        throw new NotFoundException("Location not found");
      }
    }

    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
      });
      if (!warehouse) {
        throw new NotFoundException("Warehouse not found");
      }
    }

    if (zoneId) {
      const zone = await prisma.warehouseZone.findUnique({
        where: { id: zoneId },
      });
      if (!zone) {
        throw new NotFoundException("Zone not found");
      }
    }

    // Get current system quantity
    let systemQuantity = 0;
    if (warehouseId) {
      systemQuantity = await this.stockLedgerService.getCurrentBalance(
        prisma,
        productId,
        warehouseId,
        zoneId,
      );
    } else if (locationId) {
      // Legacy location-based balance
      const currentBalance = await prisma.stockBalance.findUnique({
        where: {
          productId_locationId: {
            productId,
            locationId,
          },
        },
      });
      systemQuantity = currentBalance ? currentBalance.quantity : 0;
    }

    // Calculate variance
    const adjustment = countedQuantity - systemQuantity;
    const variancePercentage =
      systemQuantity > 0 ? (adjustment / systemQuantity) * 100 : countedQuantity > 0 ? 100 : 0;

    // Validate counted quantity
    if (countedQuantity < 0) {
      throw new BadRequestException("Counted quantity cannot be negative");
    }

    // Execute stocktake in a database transaction
    return prisma.$transaction(async (tx) => {
      // Create stocktake record
      const stocktake = await tx.stocktake.create({
        data: {
          productId,
          locationId: locationId || null,
          countedQuantity,
          systemQuantity,
          adjustment,
          performedById: userId,
        },
      });

      // If there's an adjustment, create ledger entry via StockLedgerService
      if (adjustment !== 0) {
        const transactionRemarks = remarks
          ? `Stocktake adjustment - System: ${systemQuantity}, Counted: ${countedQuantity}, Variance: ${adjustment > 0 ? "+" : ""}${adjustment} (${variancePercentage.toFixed(2)}%). Notes: ${remarks}`
          : `Stocktake adjustment - System: ${systemQuantity}, Counted: ${countedQuantity}, Variance: ${adjustment > 0 ? "+" : ""}${adjustment} (${variancePercentage.toFixed(2)}%)`;

        // Use StockLedgerService for adjustment
        await this.stockLedgerService.recordMovement(
          tenantClient,
          {
            productId,
            warehouseId: warehouseId,
            zoneId: zoneId,
            quantity: adjustment, // Positive or negative adjustment
            movementType: TransactionType.ADJUSTMENT,
            referenceType: "STOCKTAKE",
            referenceId: stocktake.id,
            remarks: transactionRemarks,
            userId,
            openingQty: systemQuantity,
            closingQty: countedQuantity,
          },
          tx,
        );

        this.logger.log(
          `Stocktake completed: Product ${productId}, System: ${systemQuantity}, Counted: ${countedQuantity}, Adjustment: ${adjustment}`,
        );
      }

      return {
        ...stocktake,
        variance: adjustment,
        variancePercentage: variancePercentage.toFixed(2),
        discrepancyReport: this.generateDiscrepancyReport({
          productId,
          productName: product.name,
          systemQuantity,
          countedQuantity,
          adjustment,
          variancePercentage,
          remarks,
        }),
      };
    });
  }

  /**
   * Generate discrepancy report
   */
  private generateDiscrepancyReport(data: {
    productId: string;
    productName: string;
    systemQuantity: number;
    countedQuantity: number;
    adjustment: number;
    variancePercentage: number;
    remarks?: string;
  }) {
    const { systemQuantity, countedQuantity, adjustment, variancePercentage } = data;

    let severity: "NONE" | "MINOR" | "MODERATE" | "MAJOR" = "NONE";
    let description = "";

    if (adjustment === 0) {
      severity = "NONE";
      description = "No discrepancy found. Physical count matches system quantity.";
    } else if (Math.abs(variancePercentage) < 1) {
      severity = "MINOR";
      description = `Minor discrepancy: ${adjustment > 0 ? "overage" : "shortage"} of ${Math.abs(adjustment)} units (${Math.abs(variancePercentage).toFixed(2)}%).`;
    } else if (Math.abs(variancePercentage) < 5) {
      severity = "MODERATE";
      description = `Moderate discrepancy: ${adjustment > 0 ? "overage" : "shortage"} of ${Math.abs(adjustment)} units (${Math.abs(variancePercentage).toFixed(2)}%). Investigation recommended.`;
    } else {
      severity = "MAJOR";
      description = `Major discrepancy: ${adjustment > 0 ? "overage" : "shortage"} of ${Math.abs(adjustment)} units (${Math.abs(variancePercentage).toFixed(2)}%). Immediate investigation required.`;
    }

    return {
      severity,
      description,
      systemQuantity,
      countedQuantity,
      adjustment,
      variancePercentage: variancePercentage.toFixed(2),
      remarks: data.remarks,
    };
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

    const [stocktakes, total] = await Promise.all([
      prisma.stocktake.findMany({
        where,
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
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.stocktake.count({ where }),
    ]);

    return createPaginatedResponse(stocktakes, total, pageNumber, limitNumber);
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const stocktake = await prisma.stocktake.findUnique({
      where: { id },
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

    if (!stocktake) {
      throw new NotFoundException("Stocktake not found");
    }

    return stocktake;
  }

  async getStocktakeSummary(tenantClient: PrismaClient, locationId?: string) {
    const prisma = this.getPrisma(tenantClient);
    const where: any = {};

    if (locationId) {
      where.locationId = locationId;
    }

    const stocktakes = await prisma.stocktake.findMany({
      where,
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
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const summary = {
      totalCount: stocktakes.length,
      adjustments: stocktakes.filter((s) => s.adjustment !== 0).length,
      totalAdjustment: stocktakes.reduce((sum, s) => sum + s.adjustment, 0),
      recentStocktakes: stocktakes.slice(0, 10),
    };

    return summary;
  }

  /**
   * Update stocktake
   */
  async update(
    tenantClient: PrismaClient,
    id: string,
    updateDto: UpdateStocktakeDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);

    // Get existing stocktake
    const existingStocktake = await prisma.stocktake.findUnique({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!existingStocktake) {
      throw new NotFoundException("Stocktake not found");
    }

    // If countedQuantity is being updated, recalculate adjustment
    if (updateDto.countedQuantity !== undefined) {
      const newCountedQuantity = updateDto.countedQuantity;
      const systemQuantity = existingStocktake.systemQuantity;
      const newAdjustment = newCountedQuantity - systemQuantity;
      const variancePercentage =
        systemQuantity > 0
          ? (newAdjustment / systemQuantity) * 100
          : newCountedQuantity > 0
            ? 100
            : 0;

      // Validate counted quantity
      if (newCountedQuantity < 0) {
        throw new BadRequestException("Counted quantity cannot be negative");
      }

      return prisma.$transaction(async (tx) => {
        // Update stocktake
        const updatedStocktake = await tx.stocktake.update({
          where: { id },
          data: {
            countedQuantity: newCountedQuantity,
            adjustment: newAdjustment,
          },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                code: true,
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

        // If adjustment changed, create new ledger entry
        if (newAdjustment !== existingStocktake.adjustment) {
          const adjustmentDiff = newAdjustment - existingStocktake.adjustment;

          // Get warehouse/zone from location if available
          let warehouseId: string | undefined;
          let zoneId: string | undefined;

          if (existingStocktake.locationId) {
            // Try to find warehouse from location
            const location = await tx.location.findUnique({
              where: { id: existingStocktake.locationId },
            });
            // Note: Location might not have direct warehouse link, this is a simplified approach
          }

          const transactionRemarks = updateDto.remarks
            ? `Stocktake update - System: ${systemQuantity}, Counted: ${newCountedQuantity}, Variance: ${newAdjustment > 0 ? "+" : ""}${newAdjustment} (${variancePercentage.toFixed(2)}%). Notes: ${updateDto.remarks}`
            : `Stocktake update - System: ${systemQuantity}, Counted: ${newCountedQuantity}, Variance: ${newAdjustment > 0 ? "+" : ""}${newAdjustment} (${variancePercentage.toFixed(2)}%)`;

          // Record adjustment via StockLedgerService
          await this.stockLedgerService.recordMovement(
            tenantClient,
            {
              productId: existingStocktake.productId,
              warehouseId: warehouseId,
              zoneId: zoneId,
              quantity: adjustmentDiff, // Difference from previous adjustment
              movementType: TransactionType.ADJUSTMENT,
              referenceType: "STOCKTAKE",
              referenceId: id,
              remarks: transactionRemarks,
              userId,
              openingQty: systemQuantity,
              closingQty: newCountedQuantity,
            },
            tx,
          );

          this.logger.log(
            `Stocktake updated: Product ${existingStocktake.productId}, ` +
              `System: ${systemQuantity}, Counted: ${newCountedQuantity}, Adjustment: ${newAdjustment}`,
          );
        }

        return {
          ...updatedStocktake,
          variance: newAdjustment,
          variancePercentage: variancePercentage.toFixed(2),
          discrepancyReport: this.generateDiscrepancyReport({
            productId: existingStocktake.productId,
            productName: existingStocktake.product.name,
            systemQuantity,
            countedQuantity: newCountedQuantity,
            adjustment: newAdjustment,
            variancePercentage,
            remarks: updateDto.remarks,
          }),
        };
      });
    }

    // If only remarks is being updated (though Stocktake model doesn't have remarks field)
    // For now, just return the existing stocktake
    const stocktake = await prisma.stocktake.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
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

    return stocktake;
  }
}
