import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreateBankTransactionDto } from "../dto/create-bank-transaction.dto";
import { BankTransactionService } from "../services/bank-transaction.service";

@ApiTags("Cash Management - Transactions")
@Controller(["financial/cash/transactions", "cash/transactions"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BankTransactionController {
  constructor(
    private readonly bankTransactionService: BankTransactionService,
  ) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create cash deposit/withdraw transaction" })
  @ApiResponse({ status: 201, description: "Transaction created" })
  create(@Body() dto: CreateBankTransactionDto) {
    return this.bankTransactionService.createTransaction(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List bank transactions" })
  findAll() {
    return this.bankTransactionService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get bank transaction by ID" })
  findOne(@Param("id") id: string) {
    return this.bankTransactionService.findOne(id);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete bank transaction (soft delete)" })
  remove(@Param("id") id: string) {
    return this.bankTransactionService.remove(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update bank transaction fields" })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<{ transactionDate: Date; description: string }>,
  ) {
    return this.bankTransactionService.update(id, dto);
  }
}
