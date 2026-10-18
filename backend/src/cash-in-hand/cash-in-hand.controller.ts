import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CashInHandService } from "./cash-in-hand.service";
import { CreateCashInHandDto } from "./dto/create-cash-in-hand.dto";
import { UpdateCashCountDto } from "./dto/update-cash-count.dto";
import { ApproveCashCountDto } from "./dto/approve-cash-count.dto";
import { CreateCashTransactionDto } from "./dto/create-cash-transaction.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Cash in Hand")
@Controller("cash-in-hand")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CashInHandController {
  constructor(private readonly cashInHandService: CashInHandService) {}

  @Get("current-balance/:locationId")
  @RequirePermission("cash.view")
  @ApiOperation({ summary: "Get current cash balance for a location" })
  @ApiParam({ name: "locationId", description: "Location ID" })
  @ApiResponse({
    status: 200,
    description: "Current balance retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Location not found" })
  async getCurrentBalance(
    @TenantClient() tenantClient: PrismaClient,
    @Param("locationId", ParseUUIDPipe) locationId: string,
  ) {
    return this.cashInHandService.getCurrentBalance(tenantClient, locationId);
  }

  @Post("open")
  @RequirePermission("cash.count")
  @ApiOperation({ summary: "Open cash register for the day" })
  @ApiResponse({
    status: 201,
    description: "Cash register opened successfully",
  })
  @ApiResponse({ status: 400, description: "Cash register already opened" })
  async openCashRegister(
    @TenantClient() tenantClient: PrismaClient,
    @Body() dto: CreateCashInHandDto,
    @Request() req: any,
  ) {
    return this.cashInHandService.createOrGetCashInHand(tenantClient, dto, req.user.id);
  }

  @Auditable({ module: AuditModule.CASH_IN_HAND })
  @Patch("count/:locationId")
  @RequirePermission("cash.count")
  @ApiOperation({ summary: "Update cash count" })
  @ApiParam({ name: "locationId", description: "Location ID" })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: true })
  @ApiResponse({ status: 200, description: "Cash count updated successfully" })
  @ApiResponse({ status: 404, description: "Record not found" })
  async updateCashCount(
    @TenantClient() tenantClient: PrismaClient,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @Query("date") date: string,
    @Body() dto: UpdateCashCountDto,
    @Request() req: any,
  ) {
    return this.cashInHandService.updateCashCount(tenantClient, locationId, date, dto, req.user.id);
  }

  @Auditable({ module: AuditModule.CASH_IN_HAND })
  @Patch("approve/:locationId")
  @RequirePermission("cash.approve")
  @ApiOperation({ summary: "Approve cash count (Admin only)" })
  @ApiParam({ name: "locationId", description: "Location ID" })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: true })
  @ApiResponse({ status: 200, description: "Cash count approved successfully" })
  @ApiResponse({ status: 404, description: "Record not found" })
  @ApiResponse({
    status: 403,
    description: "Only administrators can approve cash counts",
  })
  async approveCashCount(
    @TenantClient() tenantClient: PrismaClient,
    @Param("locationId", ParseUUIDPipe) locationId: string,
    @Query("date") date: string,
    @Body() dto: ApproveCashCountDto,
    @Request() req: any,
  ) {
    return this.cashInHandService.approveCashCount(
      tenantClient,
      locationId,
      date,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get("transactions")
  @RequirePermission("cash.view")
  @ApiOperation({ summary: "Get cash transactions" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({
    name: "startDate",
    description: "Start date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "endDate",
    description: "End date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "type",
    description: "Transaction type",
    required: false,
    enum: ["OPENING", "CASH_SALE", "PAYMENT_OUT", "REFUND", "ADJUSTMENT", "CLOSING"],
  })
  @ApiResponse({
    status: 200,
    description: "Transactions retrieved successfully",
  })
  async getTransactions(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("type") type?: string,
  ) {
    return this.cashInHandService.getTransactions(
      tenantClient,
      locationId,
      startDate,
      endDate,
      type as any,
    );
  }

  @Auditable({ module: AuditModule.CASH_IN_HAND, entity: "CashTransaction" })
  @Post("transactions")
  @RequirePermission("cash.count")
  @ApiOperation({ summary: "Create cash transaction" })
  @ApiResponse({ status: 201, description: "Transaction created successfully" })
  async createTransaction(
    @TenantClient() tenantClient: PrismaClient,
    @Body() dto: CreateCashTransactionDto,
    @Request() req: any,
  ) {
    return this.cashInHandService.createTransaction(tenantClient, dto, req.user.id);
  }

  @Get("history")
  @RequirePermission("cash.view")
  @ApiOperation({ summary: "Get cash in hand history" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({
    name: "startDate",
    description: "Start date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "endDate",
    description: "End date (YYYY-MM-DD)",
    required: false,
  })
  @ApiResponse({ status: 200, description: "History retrieved successfully" })
  async getHistory(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.cashInHandService.getHistory(tenantClient, locationId, startDate, endDate);
  }

  @Get("summary")
  @RequirePermission("cash.view")
  @ApiOperation({ summary: "Get cash summary report" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: false })
  @ApiResponse({ status: 200, description: "Summary retrieved successfully" })
  async getSummary(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
    @Query("date") date?: string,
  ) {
    return this.cashInHandService.getCashSummaryReport(tenantClient, locationId, date);
  }
}
