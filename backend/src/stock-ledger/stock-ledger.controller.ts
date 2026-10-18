import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { StockLedgerService } from "./stock-ledger.service";
import { CreateStockLedgerDto } from "./dto/create-stock-ledger.dto";
import { FilterStockLedgerDto } from "./dto/filter-stock-ledger.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Stock Ledger")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("stock-ledger")
export class StockLedgerController {
  constructor(private readonly stockLedgerService: StockLedgerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Record a stock movement" })
  @ApiResponse({
    status: 201,
    description: "Stock movement recorded successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Product/Warehouse/Zone not found" })
  async create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createDto: CreateStockLedgerDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id || req.user?.sub;

    // Convert date strings to Date objects
    const dto = {
      ...createDto,
      expiryDate: createDto.expiryDate ? new Date(createDto.expiryDate) : undefined,
      manufacturingDate: createDto.manufacturingDate
        ? new Date(createDto.manufacturingDate)
        : undefined,
      receivedDate: createDto.receivedDate ? new Date(createDto.receivedDate) : undefined,
    };

    return this.stockLedgerService.recordMovement(tenantClient, {
      ...dto,
      userId,
    });
  }

  @Get()
  @ApiOperation({ summary: "Get stock ledger entries with filters" })
  @ApiResponse({
    status: 200,
    description: "Stock ledger entries retrieved successfully",
  })
  async findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query() filterDto: FilterStockLedgerDto,
  ) {
    return this.stockLedgerService.findAll(tenantClient, filterDto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a stock ledger entry by ID" })
  @ApiResponse({
    status: 200,
    description: "Stock ledger entry retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Stock ledger entry not found" })
  async findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.stockLedgerService.findOne(tenantClient, id);
  }

  @Get("product/:productId/balance")
  @ApiOperation({ summary: "Get current stock balance for a product" })
  @ApiResponse({
    status: 200,
    description: "Stock balance retrieved successfully",
  })
  async getBalance(
    @TenantClient() tenantClient: PrismaClient,
    @Param("productId") productId: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("zoneId") zoneId?: string,
  ) {
    return this.stockLedgerService.getCurrentBalance(tenantClient, productId, warehouseId, zoneId);
  }

  @Get("product/:productId/availability")
  @ApiOperation({ summary: "Check stock availability" })
  @ApiResponse({ status: 200, description: "Stock availability checked" })
  async checkAvailability(
    @TenantClient() tenantClient: PrismaClient,
    @Param("productId") productId: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("zoneId") zoneId?: string,
    @Query("quantity") quantity?: string,
    @Query("allowExpired") allowExpired?: string,
  ) {
    const qty = quantity ? parseFloat(quantity) : 0;
    const allow = allowExpired === "true";

    const available = await this.stockLedgerService.checkStockAvailability(
      tenantClient,
      productId,
      qty,
      warehouseId,
      zoneId,
      allow,
    );

    return {
      available,
      productId,
      warehouseId,
      zoneId,
      requiredQuantity: qty,
      allowExpired: allow,
    };
  }
}
