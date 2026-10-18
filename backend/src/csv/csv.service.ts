import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { ProductsService } from "../product-management/products/products.service";
import { LocationsService } from "../locations/locations.service";
import csv from "csv-parser";
import * as createCsvWriter from "csv-writer";
import { Readable } from "stream";
import { CreateBulkImportRecordDto } from "./dto/create-bulk-import-record.dto";
import { ImportStatus } from "./dto/bulk-import-record.dto";

@Injectable()
export class CsvService {
  private readonly logger = new Logger(CsvService.name);

  constructor(
    private productsService: ProductsService,
    private locationsService: LocationsService,
  ) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for CSV operations");
    }

    return tenantClient;
  }

  async exportProducts(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: "temp/products.csv",
      header: [
        { id: "name", title: "Name" },
        { id: "code", title: "SKU" },
        { id: "category", title: "Category" },
        { id: "unit", title: "Unit" },
        { id: "reorderLevel", title: "Reorder Level" },
        { id: "createdAt", title: "Created At" },
      ],
    });

    await csvWriter.writeRecords(products);
    return "temp/products.csv";
  }

  async exportStockBalances(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);

    const balances = await prisma.stockBalance.findMany({
      include: {
        product: {
          select: {
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
            name: true,
          },
        },
      },
      orderBy: [{ product: { name: "asc" } }, { location: { name: "asc" } }],
    });

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: "temp/stock-balances.csv",
      header: [
        { id: "productName", title: "Product Name" },
        { id: "productSku", title: "Product SKU" },
        { id: "productUnit", title: "Unit" },
        { id: "locationName", title: "Location Name" },
        { id: "quantity", title: "Quantity" },
        { id: "lastUpdated", title: "Last Updated" },
      ],
    });

    const records = balances.map((balance) => ({
      productName: balance.product.name,
      productSku: balance.product.code,
      productUnit: balance.product.uom.symbol,
      locationName: balance.location.name,
      quantity: balance.quantity,
      lastUpdated: balance.lastUpdated,
    }));

    await csvWriter.writeRecords(records);
    return "temp/stock-balances.csv";
  }

  async exportStockTransactions(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);

    const transactions = await prisma.stockTransaction.findMany({
      include: {
        product: {
          select: {
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
            name: true,
          },
        },
        toLocation: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const csvWriter = createCsvWriter.createObjectCsvWriter({
      path: "temp/stock-transactions.csv",
      header: [
        { id: "productName", title: "Product Name" },
        { id: "productSku", title: "Product SKU" },
        { id: "productUnit", title: "Unit" },
        { id: "type", title: "Transaction Type" },
        { id: "quantity", title: "Quantity" },
        { id: "fromLocation", title: "From Location" },
        { id: "toLocation", title: "To Location" },
        { id: "referenceNo", title: "Reference No" },
        { id: "remarks", title: "Remarks" },
        { id: "createdById", title: "Created By" },
        { id: "createdAt", title: "Created At" },
      ],
    });

    const records = transactions.map((transaction) => ({
      productId: transaction.productId,
      type: transaction.type,
      quantity: transaction.quantity,
      fromLocationId: transaction.fromLocationId,
      toLocationId: transaction.toLocationId,
      referenceNo: transaction.referenceNo || "",
      remarks: transaction.remarks || "",
      createdById: transaction.createdById,
      createdAt: transaction.createdAt,
    }));

    await csvWriter.writeRecords(records);
    return "temp/stock-transactions.csv";
  }

  async importProducts(tenantClient: PrismaClient, file: Express.Multer.File) {
    const prisma = this.getPrisma(tenantClient);

    const results = [];
    const errors = [];

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer.toString());

      stream
        .pipe(csv())
        .on("data", async (row) => {
          try {
            const productData = {
              name: row.Name || row.name,
              code: row.CODE || row.code,
              category: row.Category || row.category || null,
              uomId: "uom-pcs", // Default to pieces UOM
              reorderLevel: parseFloat(row["Reorder Level"] || row.reorderLevel || "0"),
              minStock: 0,
              isActive: true,
            };

            // Validate required fields
            if (!productData.name || !productData.code) {
              errors.push({ row, error: "Name and SKU are required" });
              return;
            }

            const product = await this.productsService.findAll({ search: productData.code } as any);
            results.push(product);
          } catch (error) {
            errors.push({ row, error: error.message });
          }
        })
        .on("end", () => {
          resolve({ results, errors });
        })
        .on("error", reject);
    });
  }

  // Bulk Import History Methods
  async createBulkImportRecord(tenantClient: PrismaClient, createDto: CreateBulkImportRecordDto) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Creating bulk import record for file: ${createDto.fileName}`);

    const record = await prisma.bulkImportRecord.create({
      data: {
        fileName: createDto.fileName,
        originalFileName: createDto.originalFileName,
        status: createDto.status,
        totalRecords: createDto.totalRecords,
        successfulRecords: createDto.successfulRecords,
        failedRecords: createDto.failedRecords,
        errors: createDto.errors || [],
        userId: createDto.userId,
        summary: createDto.summary || {
          productsCreated: 0,
          productsUpdated: 0,
          categoriesCreated: 0,
          uomsCreated: 0,
        },
      },
    });

    this.logger.log(`Bulk import record created with ID: ${record.id}`);
    return record;
  }

  async updateBulkImportRecord(
    tenantClient: PrismaClient,
    id: string,
    updateData: {
      status?: ImportStatus;
      successfulRecords?: number;
      failedRecords?: number;
      errors?: string[];
      completedAt?: Date;
      summary?: {
        productsCreated: number;
        productsUpdated: number;
        categoriesCreated: number;
        uomsCreated: number;
      };
    },
  ) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Updating bulk import record: ${id}`);

    const record = await prisma.bulkImportRecord.update({
      where: { id },
      data: updateData,
    });

    this.logger.log(`Bulk import record updated: ${id}`);
    return record;
  }

  async getBulkImportHistory(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log("Fetching bulk import history");

    const records = await prisma.bulkImportRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    this.logger.log(`Found ${records.length} bulk import records`);
    return records;
  }

  async getBulkImportRecord(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Fetching bulk import record: ${id}`);

    const record = await prisma.bulkImportRecord.findUnique({
      where: { id },
    });

    if (!record) {
      this.logger.warn(`Bulk import record not found: ${id}`);
      return null;
    }

    this.logger.log(`Bulk import record found: ${id}`);
    return record;
  }

  async deleteBulkImportRecord(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);
    this.logger.log(`Deleting bulk import record: ${id}`);

    await prisma.bulkImportRecord.delete({
      where: { id },
    });

    this.logger.log(`Bulk import record deleted: ${id}`);
    return { message: "Bulk import record deleted successfully", id };
  }
}
