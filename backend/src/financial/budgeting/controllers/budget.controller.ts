import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  Param,
  Patch,
  Delete,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreateBudgetDto } from "../dto/create-budget.dto";
import { BudgetService } from "../services/budget.service";

@ApiTags("Budgeting")
@Controller(["financial/budgets", "budgets"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create budget with lines" })
  @ApiResponse({ status: 201, description: "Budget created successfully" })
  create(@Body() dto: CreateBudgetDto) {
    return this.budgetService.createBudget(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List budgets" })
  findAll() {
    return this.budgetService.findAll();
  }

  @Get("variance")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get budget variance (budgeted - actual)" })
  @ApiQuery({ name: "fiscalYear", required: true, type: Number })
  @ApiQuery({ name: "period", required: false, type: Number })
  @ApiResponse({ status: 200, description: "Variance calculated successfully" })
  getVariance(
    @Query("fiscalYear", ParseIntPipe) fiscalYear: number,
    @Query("period") period?: string,
  ) {
    const p = period ? Number(period) : undefined;
    return this.budgetService.getVariance(fiscalYear, p);
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get budget by ID" })
  findOne(@Param("id") id: string) {
    return this.budgetService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update budget header" })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<{ fiscalYear: number; totalBudget: number }>,
  ) {
    return this.budgetService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete budget (soft delete)" })
  remove(@Param("id") id: string) {
    return this.budgetService.remove(id);
  }
}
