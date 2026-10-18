import { BadRequestException, Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/tenant-client";
import { CreateStockTransactionDto } from "./dto/create-stock-transaction.dto";
import { BulkAdjustmentDto, BulkAdjustmentItemDto } from "./dto/bulk-adjustment.dto";
import { BulkTransferDto, BulkTransferItemDto } from "./dto/bulk-transfer.dto";
import { AuditService } from "../audit/audit.service";
import { AuditContextService } from "../audit/audit-context.service";
import { ActorType } from "../audit/utils/types";
import { PaginationDto } from "../common/dto/pagination.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";

@Injectable()
export class StockTransactionsService {
  private readonly logger = new Logger(StockTransactionsService.name);

  constructor(
    private auditService: AuditService,
    private readonly auditContext: AuditContextService,
  ) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for stock transactions");
    }

    return tenantClient;
  }

  async create(
    tenantClient: PrismaClient,
    createStockTransactionDto: CreateStockTransactionDto,
    userId: string,
    txOverride?: Prisma.TransactionClient,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const {
      productId,
      fromLocationId,
      toLocationId,
      type,
      quantity,
      referenceNo,
      remarks,
      saleId,
      saleReturnId,
      purchaseOrderId,
    } = createStockTransactionDto;

    // Validate product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Validate locations exist
    if (fromLocationId) {
      const fromLocation = await prisma.location.findUnique({
        where: { id: fromLocationId },
      });
      if (!fromLocation) {
        throw new NotFoundException("From location not found");
      }
    }

    if (toLocationId) {
      const toLocation = await prisma.location.findUnique({
        where: { id: toLocationId },
      });
      if (!toLocation) {
        throw new NotFoundException("To location not found");
      }
    }

    // Validate transaction type and locations
    this.validateTransactionType(type, fromLocationId, toLocationId);

    // Validate quantity (allow negative for ADJUSTMENT type, and allow 0 for setting exact quantity)
    if (type !== "ADJUSTMENT" && quantity <= 0) {
      throw new BadRequestException("Quantity must be greater than 0");
    }

    // Note: ADJUSTMENT type with quantity 0 is allowed (for setting exact quantity to 0)

    // Check sufficient stock for ISSUE and TRANSFER
    // Use transaction client if available to ensure consistency
    const balanceClient = txOverride || prisma;
    if (type === "ISSUE" || type === "TRANSFER") {
      const currentBalance = await this.getCurrentBalance(balanceClient, productId, fromLocationId);
      if (currentBalance < quantity) {
        throw new BadRequestException("Insufficient stock");
      }
    }

    // Generate reference number if not provided
    const finalReferenceNo = referenceNo || (await this.generateReferenceNumber(type));

    if (txOverride) {
      const transaction = await txOverride.stockTransaction.create({
        data: {
          productId,
          fromLocationId,
          toLocationId,
          type,
          quantity,
          referenceNo: finalReferenceNo,
          remarks,
          saleId,
          purchaseOrderId,
          createdById: userId,
          saleReturnId,
        },
      });

      await this.updateStockBalances(
        txOverride,
        productId,
        fromLocationId,
        toLocationId,
        type,
        quantity,
      );

      try {
        await this.auditService.log(txOverride, {
          actorId: userId,
          actorType: ActorType.USER,
          entityName: "StockTransaction",
          entityId: transaction.id,
          action: "CREATE",
          newValue: {
            productId: transaction.productId,
            fromLocationId: transaction.fromLocationId,
            toLocationId: transaction.toLocationId,
            type: transaction.type,
            quantity: transaction.quantity,
            referenceNo: transaction.referenceNo,
            remarks: transaction.remarks,
          },
        });
      } catch (auditError) {
        console.warn(`Failed to log audit trail for stock transaction: ${auditError.message}`);
      }

      return transaction;
    }

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.stockTransaction.create({
        data: {
          productId,
          fromLocationId,
          toLocationId,
          type,
          quantity,
          referenceNo: finalReferenceNo,
          remarks,
          saleId,
          purchaseOrderId,
          createdById: userId,
          saleReturnId,
        },
      });

      await this.updateStockBalances(tx, productId, fromLocationId, toLocationId, type, quantity);

      // HTTP-path audit is handled automatically by the @Auditable interceptor
      // on the controller route (module: STOCK_TRANSACTIONS). The manual log is
      // retained only in the txOverride branch above, which serves internal
      // programmatic callers (e.g. POS) that bypass the HTTP interceptor.
      return transaction;
    });
  }

  async findAll(
    tenantClient: PrismaClient,
    paginationDto: PaginationDto,
    productId?: string,
    locationId?: string,
    type?: string,
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
      where.OR = [{ fromLocationId: locationId }, { toLocationId: locationId }];
    }

    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.stockTransaction.findMany({
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
          fromLocation: {
            select: {
              id: true,
              name: true,
            },
          },
          toLocation: {
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
      prisma.stockTransaction.count({ where }),
    ]);

    return createPaginatedResponse(transactions, total, pageNumber, limitNumber);
  }

  async findOne(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    const transaction = await prisma.stockTransaction.findUnique({
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
        fromLocation: {
          select: {
            id: true,
            name: true,
          },
        },
        toLocation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return transaction;
  }

  private validateTransactionType(type: string, fromLocationId?: string, toLocationId?: string) {
    switch (type) {
      case "RECEIPT":
        if (!toLocationId) {
          throw new BadRequestException("To location is required for RECEIPT transaction");
        }
        if (fromLocationId) {
          throw new BadRequestException(
            "From location should not be specified for RECEIPT transaction",
          );
        }
        break;
      case "ISSUE":
        if (!fromLocationId) {
          throw new BadRequestException("From location is required for ISSUE transaction");
        }
        if (toLocationId) {
          throw new BadRequestException(
            "To location should not be specified for ISSUE transaction",
          );
        }
        break;
      case "TRANSFER":
        if (!fromLocationId || !toLocationId) {
          throw new BadRequestException(
            "Both from and to locations are required for TRANSFER transaction",
          );
        }
        if (fromLocationId === toLocationId) {
          throw new BadRequestException("From and to locations cannot be the same");
        }
        break;
      case "ADJUSTMENT":
        if (!fromLocationId) {
          throw new BadRequestException("From location is required for ADJUSTMENT transaction");
        }
        if (toLocationId) {
          throw new BadRequestException(
            "To location should not be specified for ADJUSTMENT transaction",
          );
        }
        break;
      default:
        throw new BadRequestException("Invalid transaction type");
    }
  }

  private async getCurrentBalance(
    prisma: PrismaClient | Prisma.TransactionClient,
    productId: string,
    locationId: string,
  ): Promise<number> {
    const balance = await prisma.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    return balance ? balance.quantity : 0;
  }

  private async updateStockBalances(
    tx: Prisma.TransactionClient | PrismaClient,
    productId: string,
    fromLocationId: string | undefined,
    toLocationId: string | undefined,
    type: string,
    quantity: number,
  ) {
    switch (type) {
      case "RECEIPT":
        // Add to destination location
        await this.upsertStockBalance(tx, productId, toLocationId!, quantity);
        break;
      case "ISSUE":
        // Subtract from source location
        await this.upsertStockBalance(tx, productId, fromLocationId!, -quantity);
        break;
      case "TRANSFER":
        // Subtract from source, add to destination
        await this.upsertStockBalance(tx, productId, fromLocationId!, -quantity);
        await this.upsertStockBalance(tx, productId, toLocationId!, quantity);
        break;
      case "ADJUSTMENT":
        // Set exact quantity (not add/subtract)
        await this.setStockBalance(tx, productId, fromLocationId!, quantity);
        break;
    }
  }

  private async upsertStockBalance(
    tx: Prisma.TransactionClient | PrismaClient,
    productId: string,
    locationId: string,
    quantityChange: number,
  ) {
    // Use upsert to handle both create and update in one operation
    // This is more efficient and avoids transaction issues
    const existingBalance = await tx.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
    });

    const currentQuantity = existingBalance?.quantity || 0;
    const newQuantity = currentQuantity + quantityChange;

    // Allow negative quantities for stocktake adjustments
    // For other transaction types, prevent negative stock
    if (newQuantity < 0) {
      console.log(
        `Stock adjustment: ${quantityChange}, Current: ${currentQuantity}, New: ${newQuantity}`,
      );
      // For now, allow negative quantities for adjustments
      // In a real system, you might want to handle this differently
    }

    await tx.stockBalance.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
      create: {
        productId,
        locationId,
        quantity: newQuantity,
        lastUpdated: new Date(),
      },
    });
  }

  private async setStockBalance(
    tx: Prisma.TransactionClient | PrismaClient,
    productId: string,
    locationId: string,
    exactQuantity: number,
  ) {
    // Set the exact quantity (used for ADJUSTMENT type)
    // This allows setting to 0 or any other value
    await tx.stockBalance.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        quantity: exactQuantity,
        lastUpdated: new Date(),
      },
      create: {
        productId,
        locationId,
        quantity: exactQuantity,
        lastUpdated: new Date(),
      },
    });
  }

  private async generateReferenceNumber(type: string): Promise<string> {
    const prefix = type.charAt(0);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${prefix}${timestamp}${random}`;
  }

  private async generateBulkReferenceNumber(operationType: "ADJUST" | "TRANSFER"): Promise<string> {
    const prefix = operationType === "ADJUST" ? "BULK-ADJ" : "BULK-TRF";
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async bulkAdjust(
    tenantClient: PrismaClient,
    bulkAdjustmentDto: BulkAdjustmentDto,
    userId: string,
  ) {
    const prisma = this.getPrisma(tenantClient);
    const { adjustments, allowPartialSuccess = false, bulkReferenceNo } = bulkAdjustmentDto;

    this.logger.log(
      `Starting bulk adjustment: ${adjustments.length} items, allowPartialSuccess: ${allowPartialSuccess}`,
    );

    // Generate bulk reference number
    const finalBulkReferenceNo =
      bulkReferenceNo || (await this.generateBulkReferenceNumber("ADJUST"));

    // Pre-validate all adjustments
    const validationResults = await this.validateBulkAdjustments(prisma, adjustments);
    if (validationResults.errors.length > 0 && !allowPartialSuccess) {
      throw new BadRequestException(
        `Validation failed: ${validationResults.errors.map((e) => e.error).join("; ")}`,
      );
    }

    const results: Array<{
      index: number;
      productId: string;
      productName: string;
      success: boolean;
      transactionId?: string;
      newQuantity?: number;
      error?: string;
    }> = [];

    if (allowPartialSuccess) {
      // Process each adjustment individually, but collect details for summary transaction
      const adjustmentDetails: Array<{
        productId: string;
        productName: string;
        locationId: string;
        type: string;
        quantity: number;
        newQuantity: number;
      }> = [];

      for (let i = 0; i < adjustments.length; i++) {
        const adjustment = adjustments[i];
        const validationError = validationResults.errors.find((e) => e.index === i);

        if (validationError) {
          results.push({
            index: i,
            productId: adjustment.productId,
            productName: validationResults.productNames.get(adjustment.productId) || "Unknown",
            success: false,
            error: validationError.error,
          });
          continue;
        }

        try {
          // Process the adjustment (update stock balance) but don't create individual transactions
          const product = await prisma.product.findUnique({
            where: { id: adjustment.productId },
            select: { id: true, name: true },
          });

          if (!product) {
            throw new NotFoundException("Product not found");
          }

          // Determine fromLocationId and toLocationId based on type
          const fromLocationId =
            adjustment.type === "ISSUE" || adjustment.type === "ADJUSTMENT"
              ? adjustment.locationId
              : undefined;
          const toLocationId = adjustment.type === "RECEIPT" ? adjustment.locationId : undefined;

          // Update stock balance
          await this.updateStockBalances(
            prisma,
            adjustment.productId,
            fromLocationId,
            toLocationId,
            adjustment.type,
            adjustment.quantity,
          );

          // Get new quantity
          const newBalance = await prisma.stockBalance.findUnique({
            where: {
              productId_locationId: {
                productId: adjustment.productId,
                locationId: adjustment.locationId,
              },
            },
            select: { quantity: true },
          });

          adjustmentDetails.push({
            productId: adjustment.productId,
            productName: product.name,
            locationId: adjustment.locationId,
            type: adjustment.type,
            quantity: adjustment.quantity,
            newQuantity: newBalance?.quantity || 0,
          });

          results.push({
            index: i,
            productId: adjustment.productId,
            productName: product.name,
            success: true,
            transactionId: "", // Will be set after creating summary transaction
            newQuantity: newBalance?.quantity || 0,
          });
        } catch (error: any) {
          this.logger.error(`Error processing adjustment ${i}:`, error);
          results.push({
            index: i,
            productId: adjustment.productId,
            productName: validationResults.productNames.get(adjustment.productId) || "Unknown",
            success: false,
            error: error.message || "Unknown error",
          });
        }
      }

      // Create a single summary transaction for the bulk operation
      if (adjustmentDetails.length > 0) {
        const firstAdjustment = adjustmentDetails[0];
        const totalQuantity = adjustmentDetails.reduce((sum, adj) => sum + adj.quantity, 0);

        // Determine the transaction type (use the most common type, or first one)
        const transactionType = firstAdjustment.type as "RECEIPT" | "ISSUE" | "ADJUSTMENT";
        const fromLocationId =
          transactionType === "ISSUE" || transactionType === "ADJUSTMENT"
            ? firstAdjustment.locationId
            : undefined;
        const toLocationId = transactionType === "RECEIPT" ? firstAdjustment.locationId : undefined;

        const summaryTransaction = await prisma.stockTransaction.create({
          data: {
            productId: firstAdjustment.productId, // Use first product as placeholder
            fromLocationId,
            toLocationId,
            type: transactionType,
            quantity: totalQuantity, // Total quantity across all products
            referenceNo: finalBulkReferenceNo,
            remarks: JSON.stringify({
              bulkOperation: true,
              bulkReferenceNo: finalBulkReferenceNo,
              totalItems: adjustmentDetails.length,
              items: adjustmentDetails.map((adj) => ({
                productId: adj.productId,
                productName: adj.productName,
                locationId: adj.locationId,
                type: adj.type,
                quantity: adj.quantity,
                newQuantity: adj.newQuantity,
              })),
            }),
            createdById: userId,
          },
        });

        // Update all successful results with the summary transaction ID
        results.forEach((result) => {
          if (result.success) {
            result.transactionId = summaryTransaction.id;
          }
        });
      }
    } else {
      // Process all in a single transaction (all-or-nothing)
      try {
        await prisma.$transaction(
          async (tx) => {
            // Collect all adjustment details for the summary transaction
            const adjustmentDetails: Array<{
              productId: string;
              productName: string;
              locationId: string;
              type: string;
              quantity: number;
              newQuantity: number;
            }> = [];

            // Process all adjustments within the transaction
            for (let i = 0; i < adjustments.length; i++) {
              const adjustment = adjustments[i];
              const validationError = validationResults.errors.find((e) => e.index === i);

              if (validationError) {
                throw new BadRequestException(
                  `Item ${i + 1} (${validationResults.productNames.get(adjustment.productId) || adjustment.productId}): ${validationError.error}`,
                );
              }

              // Process the adjustment (update stock balance) but don't create individual transactions
              const product = await tx.product.findUnique({
                where: { id: adjustment.productId },
                select: { id: true, name: true },
              });

              if (!product) {
                throw new NotFoundException("Product not found");
              }

              // Determine fromLocationId and toLocationId based on type
              const fromLocationId =
                adjustment.type === "ISSUE" || adjustment.type === "ADJUSTMENT"
                  ? adjustment.locationId
                  : undefined;
              const toLocationId =
                adjustment.type === "RECEIPT" ? adjustment.locationId : undefined;

              // Update stock balance
              await this.updateStockBalances(
                tx,
                adjustment.productId,
                fromLocationId,
                toLocationId,
                adjustment.type,
                adjustment.quantity,
              );

              // Get new quantity
              const newBalance = await tx.stockBalance.findUnique({
                where: {
                  productId_locationId: {
                    productId: adjustment.productId,
                    locationId: adjustment.locationId,
                  },
                },
                select: { quantity: true },
              });

              adjustmentDetails.push({
                productId: adjustment.productId,
                productName: product.name,
                locationId: adjustment.locationId,
                type: adjustment.type,
                quantity: adjustment.quantity,
                newQuantity: newBalance?.quantity || 0,
              });

              results.push({
                index: i,
                productId: adjustment.productId,
                productName: product.name,
                success: true,
                transactionId: "", // Will be set after creating summary transaction
                newQuantity: newBalance?.quantity || 0,
              });
            }

            // Create a single summary transaction for the bulk operation
            if (adjustmentDetails.length > 0) {
              const firstAdjustment = adjustmentDetails[0];
              const totalQuantity = adjustmentDetails.reduce((sum, adj) => sum + adj.quantity, 0);

              // Determine the transaction type (use the most common type, or first one)
              const transactionType = firstAdjustment.type as "RECEIPT" | "ISSUE" | "ADJUSTMENT";
              const fromLocationId =
                transactionType === "ISSUE" || transactionType === "ADJUSTMENT"
                  ? firstAdjustment.locationId
                  : undefined;
              const toLocationId =
                transactionType === "RECEIPT" ? firstAdjustment.locationId : undefined;

              const summaryTransaction = await tx.stockTransaction.create({
                data: {
                  productId: firstAdjustment.productId, // Use first product as placeholder
                  fromLocationId,
                  toLocationId,
                  type: transactionType,
                  quantity: totalQuantity, // Total quantity across all products
                  referenceNo: finalBulkReferenceNo,
                  remarks: JSON.stringify({
                    bulkOperation: true,
                    bulkReferenceNo: finalBulkReferenceNo,
                    totalItems: adjustmentDetails.length,
                    items: adjustmentDetails.map((adj) => ({
                      productId: adj.productId,
                      productName: adj.productName,
                      locationId: adj.locationId,
                      type: adj.type,
                      quantity: adj.quantity,
                      newQuantity: adj.newQuantity,
                    })),
                  }),
                  createdById: userId,
                },
              });

              // Update all results with the summary transaction ID
              results.forEach((result) => {
                result.transactionId = summaryTransaction.id;
              });
            }
          },
          {
            maxWait: 10000, // Maximum time to wait for a transaction slot
            timeout: 30000, // Maximum time the transaction can run
          },
        );
      } catch (error: any) {
        this.logger.error("Bulk adjustment transaction failed:", error);
        throw new BadRequestException(
          `Bulk adjustment failed: ${error.message || "Unknown error"}`,
        );
      }
    }

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // The bulk response is a summary object with no entity `id`, so tell the
    // @Auditable interceptor which id to record (the bulk reference number).
    this.auditContext.setEntityId(finalBulkReferenceNo);

    this.logger.log(`Bulk adjustment completed: ${processed} processed, ${failed} failed`);

    return {
      success: failed === 0,
      bulkReferenceNo: finalBulkReferenceNo,
      total: adjustments.length,
      processed,
      failed,
      results,
    };
  }

  async bulkTransfer(tenantClient: PrismaClient, bulkTransferDto: BulkTransferDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);
    const { transfers, allowPartialSuccess = false, bulkReferenceNo } = bulkTransferDto;

    this.logger.log(
      `Starting bulk transfer: ${transfers.length} items, allowPartialSuccess: ${allowPartialSuccess}`,
    );

    // Generate bulk reference number
    const finalBulkReferenceNo =
      bulkReferenceNo || (await this.generateBulkReferenceNumber("TRANSFER"));

    // Pre-validate all transfers
    const validationResults = await this.validateBulkTransfers(prisma, transfers);
    if (validationResults.errors.length > 0 && !allowPartialSuccess) {
      throw new BadRequestException(
        `Validation failed: ${validationResults.errors.map((e) => e.error).join("; ")}`,
      );
    }

    const results: Array<{
      index: number;
      productId: string;
      productName: string;
      success: boolean;
      transactionId?: string;
      fromQuantity?: number;
      toQuantity?: number;
      error?: string;
    }> = [];

    if (allowPartialSuccess) {
      // Process each transfer individually, but collect details for summary transaction
      const transferDetails: Array<{
        productId: string;
        productName: string;
        fromLocationId: string;
        toLocationId: string;
        quantity: number;
        fromQuantity: number;
        toQuantity: number;
      }> = [];

      for (let i = 0; i < transfers.length; i++) {
        const transfer = transfers[i];
        const validationError = validationResults.errors.find((e) => e.index === i);

        if (validationError) {
          results.push({
            index: i,
            productId: transfer.productId,
            productName: validationResults.productNames.get(transfer.productId) || "Unknown",
            success: false,
            error: validationError.error,
          });
          continue;
        }

        try {
          // Process the transfer (update stock balance) but don't create individual transactions
          const product = await prisma.product.findUnique({
            where: { id: transfer.productId },
            select: { id: true, name: true },
          });

          if (!product) {
            throw new NotFoundException("Product not found");
          }

          // Update stock balance
          await this.updateStockBalances(
            prisma,
            transfer.productId,
            transfer.fromLocationId,
            transfer.toLocationId,
            "TRANSFER",
            transfer.quantity,
          );

          // Get new quantities
          const [fromBalance, toBalance] = await Promise.all([
            prisma.stockBalance.findUnique({
              where: {
                productId_locationId: {
                  productId: transfer.productId,
                  locationId: transfer.fromLocationId,
                },
              },
              select: { quantity: true },
            }),
            prisma.stockBalance.findUnique({
              where: {
                productId_locationId: {
                  productId: transfer.productId,
                  locationId: transfer.toLocationId,
                },
              },
              select: { quantity: true },
            }),
          ]);

          transferDetails.push({
            productId: transfer.productId,
            productName: product.name,
            fromLocationId: transfer.fromLocationId,
            toLocationId: transfer.toLocationId,
            quantity: transfer.quantity,
            fromQuantity: fromBalance?.quantity || 0,
            toQuantity: toBalance?.quantity || 0,
          });

          results.push({
            index: i,
            productId: transfer.productId,
            productName: product.name,
            success: true,
            transactionId: "", // Will be set after creating summary transaction
            fromQuantity: fromBalance?.quantity || 0,
            toQuantity: toBalance?.quantity || 0,
          });
        } catch (error: any) {
          this.logger.error(`Error processing transfer ${i}:`, error);
          results.push({
            index: i,
            productId: transfer.productId,
            productName: validationResults.productNames.get(transfer.productId) || "Unknown",
            success: false,
            error: error.message || "Unknown error",
          });
        }
      }

      // Create a single summary transaction for the bulk operation
      if (transferDetails.length > 0) {
        const firstTransfer = transferDetails[0];
        const totalQuantity = transferDetails.reduce((sum, trf) => sum + trf.quantity, 0);

        const summaryTransaction = await prisma.stockTransaction.create({
          data: {
            productId: firstTransfer.productId, // Use first product as placeholder
            fromLocationId: firstTransfer.fromLocationId,
            toLocationId: firstTransfer.toLocationId,
            type: "TRANSFER",
            quantity: totalQuantity, // Total quantity across all products
            referenceNo: finalBulkReferenceNo,
            remarks: JSON.stringify({
              bulkOperation: true,
              bulkReferenceNo: finalBulkReferenceNo,
              totalItems: transferDetails.length,
              items: transferDetails.map((trf) => ({
                productId: trf.productId,
                productName: trf.productName,
                fromLocationId: trf.fromLocationId,
                toLocationId: trf.toLocationId,
                quantity: trf.quantity,
                fromQuantity: trf.fromQuantity,
                toQuantity: trf.toQuantity,
              })),
            }),
            createdById: userId,
          },
        });

        // Update all successful results with the summary transaction ID
        results.forEach((result) => {
          if (result.success) {
            result.transactionId = summaryTransaction.id;
          }
        });
      }
    } else {
      // Process all in a single transaction (all-or-nothing)
      try {
        await prisma.$transaction(
          async (tx) => {
            // Collect all transfer details for the summary transaction
            const transferDetails: Array<{
              productId: string;
              productName: string;
              fromLocationId: string;
              toLocationId: string;
              quantity: number;
              fromQuantity: number;
              toQuantity: number;
            }> = [];

            // Process all transfers within the transaction
            for (let i = 0; i < transfers.length; i++) {
              const transfer = transfers[i];
              const validationError = validationResults.errors.find((e) => e.index === i);

              if (validationError) {
                throw new BadRequestException(
                  `Item ${i + 1} (${validationResults.productNames.get(transfer.productId) || transfer.productId}): ${validationError.error}`,
                );
              }

              // Process the transfer (update stock balance) but don't create individual transactions
              const product = await tx.product.findUnique({
                where: { id: transfer.productId },
                select: { id: true, name: true },
              });

              if (!product) {
                throw new NotFoundException("Product not found");
              }

              // Update stock balance
              await this.updateStockBalances(
                tx,
                transfer.productId,
                transfer.fromLocationId,
                transfer.toLocationId,
                "TRANSFER",
                transfer.quantity,
              );

              // Get new quantities
              const [fromBalance, toBalance] = await Promise.all([
                tx.stockBalance.findUnique({
                  where: {
                    productId_locationId: {
                      productId: transfer.productId,
                      locationId: transfer.fromLocationId,
                    },
                  },
                  select: { quantity: true },
                }),
                tx.stockBalance.findUnique({
                  where: {
                    productId_locationId: {
                      productId: transfer.productId,
                      locationId: transfer.toLocationId,
                    },
                  },
                  select: { quantity: true },
                }),
              ]);

              transferDetails.push({
                productId: transfer.productId,
                productName: product.name,
                fromLocationId: transfer.fromLocationId,
                toLocationId: transfer.toLocationId,
                quantity: transfer.quantity,
                fromQuantity: fromBalance?.quantity || 0,
                toQuantity: toBalance?.quantity || 0,
              });

              results.push({
                index: i,
                productId: transfer.productId,
                productName: product.name,
                success: true,
                transactionId: "", // Will be set after creating summary transaction
                fromQuantity: fromBalance?.quantity || 0,
                toQuantity: toBalance?.quantity || 0,
              });
            }

            // Create a single summary transaction for the bulk operation
            if (transferDetails.length > 0) {
              const firstTransfer = transferDetails[0];
              const totalQuantity = transferDetails.reduce((sum, trf) => sum + trf.quantity, 0);

              const summaryTransaction = await tx.stockTransaction.create({
                data: {
                  productId: firstTransfer.productId, // Use first product as placeholder
                  fromLocationId: firstTransfer.fromLocationId,
                  toLocationId: firstTransfer.toLocationId,
                  type: "TRANSFER",
                  quantity: totalQuantity, // Total quantity across all products
                  referenceNo: finalBulkReferenceNo,
                  remarks: JSON.stringify({
                    bulkOperation: true,
                    bulkReferenceNo: finalBulkReferenceNo,
                    totalItems: transferDetails.length,
                    items: transferDetails.map((trf) => ({
                      productId: trf.productId,
                      productName: trf.productName,
                      fromLocationId: trf.fromLocationId,
                      toLocationId: trf.toLocationId,
                      quantity: trf.quantity,
                      fromQuantity: trf.fromQuantity,
                      toQuantity: trf.toQuantity,
                    })),
                  }),
                  createdById: userId,
                },
              });

              // Update all results with the summary transaction ID
              results.forEach((result) => {
                result.transactionId = summaryTransaction.id;
              });
            }
          },
          {
            maxWait: 10000, // Maximum time to wait for a transaction slot
            timeout: 30000, // Maximum time the transaction can run
          },
        );
      } catch (error: any) {
        this.logger.error("Bulk transfer transaction failed:", error);
        throw new BadRequestException(`Bulk transfer failed: ${error.message || "Unknown error"}`);
      }
    }

    const processed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // The bulk response is a summary object with no entity `id`, so tell the
    // @Auditable interceptor which id to record (the bulk reference number).
    this.auditContext.setEntityId(finalBulkReferenceNo);

    this.logger.log(`Bulk transfer completed: ${processed} processed, ${failed} failed`);

    return {
      success: failed === 0,
      bulkReferenceNo: finalBulkReferenceNo,
      total: transfers.length,
      processed,
      failed,
      results,
    };
  }

  private async validateBulkAdjustments(
    prisma: PrismaClient,
    adjustments: BulkAdjustmentItemDto[],
  ): Promise<{
    errors: Array<{ index: number; error: string }>;
    productNames: Map<string, string>;
  }> {
    const errors: Array<{ index: number; error: string }> = [];
    const productNames = new Map<string, string>();

    // Batch fetch all products
    const productIds = [...new Set(adjustments.map((a) => a.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    products.forEach((p) => productNames.set(p.id, p.name));

    // Batch fetch all locations
    const locationIds = [...new Set(adjustments.map((a) => a.locationId))];
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true },
    });

    const validLocationIds = new Set(locations.map((l) => l.id));

    // Batch fetch current balances for ISSUE type
    const issueAdjustments = adjustments.filter((a) => a.type === "ISSUE");
    const balanceQueries = issueAdjustments.map((a) => ({
      productId: a.productId,
      locationId: a.locationId,
    }));

    const balances = await prisma.stockBalance.findMany({
      where: {
        OR: balanceQueries.map((q) => ({
          productId: q.productId,
          locationId: q.locationId,
        })),
      },
      select: {
        productId: true,
        locationId: true,
        quantity: true,
      },
    });

    const balanceMap = new Map<string, number>();
    balances.forEach((b) => {
      balanceMap.set(`${b.productId}-${b.locationId}`, b.quantity);
    });

    // Validate each adjustment
    for (let i = 0; i < adjustments.length; i++) {
      const adjustment = adjustments[i];

      // Validate product exists
      if (!productNames.has(adjustment.productId)) {
        errors.push({ index: i, error: "Product not found" });
        continue;
      }

      // Validate location exists
      if (!validLocationIds.has(adjustment.locationId)) {
        errors.push({ index: i, error: "Location not found" });
        continue;
      }

      // Validate transaction type
      try {
        const fromLocationId =
          adjustment.type === "ISSUE" || adjustment.type === "ADJUSTMENT"
            ? adjustment.locationId
            : undefined;
        const toLocationId = adjustment.type === "RECEIPT" ? adjustment.locationId : undefined;
        this.validateTransactionType(adjustment.type, fromLocationId, toLocationId);
      } catch (error: any) {
        errors.push({ index: i, error: error.message });
        continue;
      }

      // Validate quantity
      if (adjustment.type !== "ADJUSTMENT" && adjustment.quantity <= 0) {
        errors.push({ index: i, error: "Quantity must be greater than 0" });
        continue;
      }

      // Note: ADJUSTMENT type with quantity 0 is allowed (for setting exact quantity to 0)
      if (adjustment.type === "ADJUSTMENT" && adjustment.quantity < 0) {
        errors.push({
          index: i,
          error: "Adjustment quantity cannot be negative",
        });
        continue;
      }

      // Check sufficient stock for ISSUE
      if (adjustment.type === "ISSUE") {
        const balanceKey = `${adjustment.productId}-${adjustment.locationId}`;
        const currentBalance = balanceMap.get(balanceKey) || 0;
        if (currentBalance < adjustment.quantity) {
          errors.push({
            index: i,
            error: `Insufficient stock. Available: ${currentBalance}, Requested: ${adjustment.quantity}`,
          });
        }
      }
    }

    return { errors, productNames };
  }

  private async validateBulkTransfers(
    prisma: PrismaClient,
    transfers: BulkTransferItemDto[],
  ): Promise<{
    errors: Array<{ index: number; error: string }>;
    productNames: Map<string, string>;
  }> {
    const errors: Array<{ index: number; error: string }> = [];
    const productNames = new Map<string, string>();

    // Batch fetch all products
    const productIds = [...new Set(transfers.map((t) => t.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    products.forEach((p) => productNames.set(p.id, p.name));

    // Batch fetch all locations
    const locationIds = [
      ...new Set([
        ...transfers.map((t) => t.fromLocationId),
        ...transfers.map((t) => t.toLocationId),
      ]),
    ];
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { id: true },
    });

    const validLocationIds = new Set(locations.map((l) => l.id));

    // Batch fetch current balances
    const balanceQueries = transfers.map((t) => ({
      productId: t.productId,
      locationId: t.fromLocationId,
    }));

    const balances = await prisma.stockBalance.findMany({
      where: {
        OR: balanceQueries.map((q) => ({
          productId: q.productId,
          locationId: q.locationId,
        })),
      },
      select: {
        productId: true,
        locationId: true,
        quantity: true,
      },
    });

    const balanceMap = new Map<string, number>();
    balances.forEach((b) => {
      balanceMap.set(`${b.productId}-${b.locationId}`, b.quantity);
    });

    // Validate each transfer
    for (let i = 0; i < transfers.length; i++) {
      const transfer = transfers[i];

      // Validate product exists
      if (!productNames.has(transfer.productId)) {
        errors.push({ index: i, error: "Product not found" });
        continue;
      }

      // Validate locations exist
      if (!validLocationIds.has(transfer.fromLocationId)) {
        errors.push({ index: i, error: "From location not found" });
        continue;
      }

      if (!validLocationIds.has(transfer.toLocationId)) {
        errors.push({ index: i, error: "To location not found" });
        continue;
      }

      // Validate from and to are different
      if (transfer.fromLocationId === transfer.toLocationId) {
        errors.push({
          index: i,
          error: "From and to locations cannot be the same",
        });
        continue;
      }

      // Validate quantity
      if (transfer.quantity <= 0) {
        errors.push({ index: i, error: "Quantity must be greater than 0" });
        continue;
      }

      // Check sufficient stock
      const balanceKey = `${transfer.productId}-${transfer.fromLocationId}`;
      const currentBalance = balanceMap.get(balanceKey) || 0;
      if (currentBalance < transfer.quantity) {
        errors.push({
          index: i,
          error: `Insufficient stock. Available: ${currentBalance}, Requested: ${transfer.quantity}`,
        });
      }
    }

    return { errors, productNames };
  }

  private async processBulkAdjustment(
    tx: Prisma.TransactionClient | PrismaClient,
    adjustment: BulkAdjustmentItemDto,
    userId: string,
    bulkReferenceNo: string,
    index: number,
  ): Promise<{
    index: number;
    productId: string;
    productName: string;
    success: boolean;
    transactionId: string;
    newQuantity: number;
  }> {
    const product = await tx.product.findUnique({
      where: { id: adjustment.productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Determine fromLocationId and toLocationId based on type
    const fromLocationId =
      adjustment.type === "ISSUE" || adjustment.type === "ADJUSTMENT"
        ? adjustment.locationId
        : undefined;
    const toLocationId = adjustment.type === "RECEIPT" ? adjustment.locationId : undefined;

    // Generate reference number
    const referenceNo = await this.generateReferenceNumber(adjustment.type);

    // Create transaction
    const transaction = await tx.stockTransaction.create({
      data: {
        productId: adjustment.productId,
        fromLocationId,
        toLocationId,
        type: adjustment.type,
        quantity: adjustment.quantity,
        referenceNo,
        remarks: adjustment.remarks || `Bulk operation: ${bulkReferenceNo}`,
        createdById: userId,
      },
    });

    // Update stock balance
    await this.updateStockBalances(
      tx,
      adjustment.productId,
      fromLocationId,
      toLocationId,
      adjustment.type,
      adjustment.quantity,
    );

    // Get new quantity
    const newBalance = await tx.stockBalance.findUnique({
      where: {
        productId_locationId: {
          productId: adjustment.productId,
          locationId: adjustment.locationId,
        },
      },
      select: { quantity: true },
    });

    // Note: Individual audit logging is skipped during bulk operations
    // to avoid transaction issues. Audit is logged at the bulk operation level.

    return {
      index,
      productId: adjustment.productId,
      productName: product.name,
      success: true,
      transactionId: transaction.id,
      newQuantity: newBalance?.quantity || 0,
    };
  }

  private async processBulkTransfer(
    tx: Prisma.TransactionClient | PrismaClient,
    transfer: BulkTransferItemDto,
    userId: string,
    bulkReferenceNo: string,
    index: number,
  ): Promise<{
    index: number;
    productId: string;
    productName: string;
    success: boolean;
    transactionId: string;
    fromQuantity: number;
    toQuantity: number;
  }> {
    const product = await tx.product.findUnique({
      where: { id: transfer.productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // Generate reference number
    const referenceNo = await this.generateReferenceNumber("TRANSFER");

    // Create transaction
    const transaction = await tx.stockTransaction.create({
      data: {
        productId: transfer.productId,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        type: "TRANSFER",
        quantity: transfer.quantity,
        referenceNo,
        remarks: transfer.remarks || `Bulk operation: ${bulkReferenceNo}`,
        createdById: userId,
      },
    });

    // Update stock balances
    await this.updateStockBalances(
      tx,
      transfer.productId,
      transfer.fromLocationId,
      transfer.toLocationId,
      "TRANSFER",
      transfer.quantity,
    );

    // Get new quantities
    const [fromBalance, toBalance] = await Promise.all([
      tx.stockBalance.findUnique({
        where: {
          productId_locationId: {
            productId: transfer.productId,
            locationId: transfer.fromLocationId,
          },
        },
        select: { quantity: true },
      }),
      tx.stockBalance.findUnique({
        where: {
          productId_locationId: {
            productId: transfer.productId,
            locationId: transfer.toLocationId,
          },
        },
        select: { quantity: true },
      }),
    ]);

    // Note: Individual audit logging is skipped during bulk operations
    // to avoid transaction issues. Audit is logged at the bulk operation level.

    return {
      index,
      productId: transfer.productId,
      productName: product.name,
      success: true,
      transactionId: transaction.id,
      fromQuantity: fromBalance?.quantity || 0,
      toQuantity: toBalance?.quantity || 0,
    };
  }
}
