import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { ExpensesService } from "./expenses.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { ExpenseQueryDto } from "./dto/expense-query.dto";
import { ApproveExpenseDto } from "./dto/approve-expense.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Expenses")
@Controller("expenses")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Auditable({ module: AuditModule.EXPENSES })
  @Post()
  @RequirePermission("expenses.create")
  @ApiOperation({ summary: "Create a new expense" })
  @ApiResponse({ status: 201, description: "Expense created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Category or location not found" })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createDto: CreateExpenseDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.expensesService.create(tenantClient, createDto, userId);
  }

  @Get()
  @RequirePermission("expenses.read")
  @ApiOperation({ summary: "Get all expenses" })
  @ApiResponse({ status: 200, description: "Expenses retrieved successfully" })
  findAll(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: ExpenseQueryDto) {
    return this.expensesService.findAll(tenantClient, queryDto);
  }

  @Get(":id")
  @RequirePermission("expenses.read")
  @ApiOperation({ summary: "Get expense by ID" })
  @ApiResponse({ status: 200, description: "Expense retrieved successfully" })
  @ApiResponse({ status: 404, description: "Expense not found" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.expensesService.findOne(tenantClient, id);
  }

  @Auditable({ module: AuditModule.EXPENSES })
  @Patch(":id")
  @RequirePermission("expenses.update")
  @ApiOperation({ summary: "Update expense" })
  @ApiResponse({ status: 200, description: "Expense updated successfully" })
  @ApiResponse({ status: 404, description: "Expense not found" })
  @ApiResponse({ status: 400, description: "Cannot update paid expense" })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateDto: UpdateExpenseDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.expensesService.update(tenantClient, id, updateDto, userId);
  }

  @Auditable({ module: AuditModule.EXPENSES })
  @Delete(":id")
  @RequirePermission("expenses.delete")
  @ApiOperation({ summary: "Delete expense" })
  @ApiResponse({ status: 200, description: "Expense deleted successfully" })
  @ApiResponse({ status: 404, description: "Expense not found" })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.expensesService.remove(tenantClient, id, userId);
  }

  @Post(":id/approve")
  @RequirePermission("expenses.approve")
  @ApiOperation({ summary: "Approve or reject expense" })
  @ApiResponse({
    status: 200,
    description: "Expense status updated successfully",
  })
  @ApiResponse({ status: 404, description: "Expense not found" })
  approve(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() approveDto: ApproveExpenseDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.expensesService.approve(tenantClient, id, approveDto, userId);
  }

  @Post(":id/pay")
  @RequirePermission("expenses.update")
  @ApiOperation({ summary: "Mark expense as paid" })
  @ApiResponse({ status: 200, description: "Expense marked as paid" })
  @ApiResponse({ status: 404, description: "Expense not found" })
  markAsPaid(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.expensesService.markAsPaid(tenantClient, id, userId);
  }
}
