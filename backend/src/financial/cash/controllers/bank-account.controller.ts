import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreateBankAccountDto } from "../dto/create-bank-account.dto";
import { BankAccountService } from "../services/bank-account.service";

@ApiTags("Cash Management - Bank Accounts")
@Controller(["financial/cash/accounts", "cash/accounts"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create a bank account" })
  @ApiResponse({ status: 201, description: "Bank account created" })
  create(@Body() dto: CreateBankAccountDto) {
    return this.bankAccountService.createAccount(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List bank accounts" })
  findAll() {
    return this.bankAccountService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get bank account by ID" })
  findOne(@Param("id") id: string) {
    return this.bankAccountService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update bank account" })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<{ accountName: string; currency: string }>,
  ) {
    return this.bankAccountService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete bank account (soft delete)" })
  remove(@Param("id") id: string) {
    return this.bankAccountService.remove(id);
  }
}
