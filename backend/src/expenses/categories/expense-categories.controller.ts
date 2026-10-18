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
import { ExpenseCategoriesService } from "./expense-categories.service";
import { CreateExpenseCategoryDto } from "./dto/create-expense-category.dto";
import { UpdateExpenseCategoryDto } from "./dto/update-expense-category.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { TenantClient } from "../../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";

@ApiTags("Expense Categories")
@Controller("expense-categories")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ExpenseCategoriesController {
  constructor(private readonly categoriesService: ExpenseCategoriesService) {}

  @Auditable({ module: AuditModule.EXPENSES, entity: "ExpenseCategory" })
  @Post()
  @RequirePermission("expenses.create")
  @ApiOperation({ summary: "Create a new expense category" })
  @ApiResponse({
    status: 201,
    description: "Expense category created successfully",
  })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createDto: CreateExpenseCategoryDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.categoriesService.create(tenantClient, createDto, userId);
  }

  @Get()
  @RequirePermission("expenses.read")
  @ApiOperation({ summary: "Get all expense categories" })
  @ApiResponse({
    status: 200,
    description: "Expense categories retrieved successfully",
  })
  findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.categoriesService.findAll(tenantClient, includeInactive === "true");
  }

  @Get(":id")
  @RequirePermission("expenses.read")
  @ApiOperation({ summary: "Get expense category by ID" })
  @ApiResponse({
    status: 200,
    description: "Expense category retrieved successfully",
  })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.categoriesService.findOne(tenantClient, id);
  }

  @Auditable({ module: AuditModule.EXPENSES, entity: "ExpenseCategory" })
  @Patch(":id")
  @RequirePermission("expenses.update")
  @ApiOperation({ summary: "Update expense category" })
  @ApiResponse({
    status: 200,
    description: "Expense category updated successfully",
  })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateDto: UpdateExpenseCategoryDto,
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    return this.categoriesService.update(tenantClient, id, updateDto, userId);
  }

  @Auditable({ module: AuditModule.EXPENSES, entity: "ExpenseCategory" })
  @Delete(":id")
  @RequirePermission("expenses.delete")
  @ApiOperation({ summary: "Delete expense category" })
  @ApiResponse({
    status: 200,
    description: "Expense category deleted successfully",
  })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req: any) {
    const userId = req.user?.id;
    return this.categoriesService.remove(tenantClient, id, userId);
  }
}
