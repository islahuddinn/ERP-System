import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { StocktakeService } from "./stocktake.service";
import { CreateStocktakeDto } from "./dto/create-stocktake.dto";
import { UpdateStocktakeDto } from "./dto/update-stocktake.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Stocktake")
@Controller("stocktake")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class StocktakeController {
  constructor(private readonly stocktakeService: StocktakeService) {}

  @Post()
  @RequirePermission("stock.stocktake")
  @ApiOperation({ summary: "Create a new stocktake" })
  @ApiResponse({ status: 201, description: "Stocktake created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Product or location not found" })
  async create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createStocktakeDto: CreateStocktakeDto,
    @Request() req,
  ) {
    return this.stocktakeService.create(tenantClient, createStocktakeDto, req.user.id);
  }

  @Get()
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get all stocktakes" })
  @ApiResponse({
    status: 200,
    description: "Stocktakes retrieved successfully",
  })
  @ApiQuery({
    name: "productId",
    required: false,
    description: "Filter by product ID",
  })
  @ApiQuery({
    name: "locationId",
    required: false,
    description: "Filter by location ID",
  })
  findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query() paginationDto: PaginationDto,
    @Query("productId") productId?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.stocktakeService.findAll(tenantClient, paginationDto, productId, locationId);
  }

  @Get("summary")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get stocktake summary" })
  @ApiResponse({ status: 200, description: "Summary retrieved successfully" })
  @ApiQuery({
    name: "locationId",
    required: false,
    description: "Filter by location ID",
  })
  getSummary(@TenantClient() tenantClient: PrismaClient, @Query("locationId") locationId?: string) {
    return this.stocktakeService.getStocktakeSummary(tenantClient, locationId);
  }

  @Get(":id")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get stocktake by ID" })
  @ApiResponse({ status: 200, description: "Stocktake retrieved successfully" })
  @ApiResponse({ status: 404, description: "Stocktake not found" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.stocktakeService.findOne(tenantClient, id);
  }

  @Patch(":id")
  @RequirePermission("stock.stocktake")
  @ApiOperation({ summary: "Update stocktake" })
  @ApiResponse({ status: 200, description: "Stocktake updated successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Stocktake not found" })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateStocktakeDto: UpdateStocktakeDto,
    @Request() req,
  ) {
    return this.stocktakeService.update(tenantClient, id, updateStocktakeDto, req.user.id);
  }
}
