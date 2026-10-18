import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { CustomerBankAccountsService } from "./customer-bank-accounts.service";
import { CreateCustomerBankAccountDto } from "./dto/create-customer-bank-account.dto";
import { UpdateCustomerBankAccountDto } from "./dto/update-customer-bank-account.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";

@ApiTags("Customer Bank Accounts")
@Controller("customers/:customerId/bank-accounts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomerBankAccountsController {
  constructor(private readonly bankAccountsService: CustomerBankAccountsService) {}

  @Post()
  @RequirePermission("customers.create")
  @Auditable({ module: AuditModule.CUSTOMERS })
  @ApiOperation({ summary: "Add a bank account to a customer" })
  create(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Body() dto: CreateCustomerBankAccountDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.create(customerId, dto, req);
  }

  @Get()
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "List all bank accounts for a customer" })
  findAll(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.bankAccountsService.findAll(customerId);
  }

  @Get(":bankAccountId")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get a single customer bank account" })
  findOne(@Param("customerId", ParseUUIDPipe) customerId: string, @Param("bankAccountId", ParseUUIDPipe) bankAccountId: string) {
    return this.bankAccountsService.findOne(customerId, bankAccountId);
  }

  @Patch(":bankAccountId")
  @RequirePermission("customers.update")
  @Auditable({ module: AuditModule.CUSTOMERS })
  @ApiOperation({ summary: "Update a customer bank account" })
  update(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Param("bankAccountId", ParseUUIDPipe) bankAccountId: string,
    @Body() dto: UpdateCustomerBankAccountDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.update(customerId, bankAccountId, dto, req);
  }

  @Patch(":bankAccountId/set-default")
  @RequirePermission("customers.update")
  @Auditable({ module: AuditModule.CUSTOMERS })
  @ApiOperation({ summary: "Mark a bank account as the default for this customer" })
  setDefault(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Param("bankAccountId", ParseUUIDPipe) bankAccountId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.setDefault(customerId, bankAccountId, req);
  }

  @Delete(":bankAccountId")
  @RequirePermission("customers.delete")
  @Auditable({ module: AuditModule.CUSTOMERS })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete a customer bank account" })
  remove(@Param("customerId", ParseUUIDPipe) customerId: string, @Param("bankAccountId", ParseUUIDPipe) bankAccountId: string) {
    return this.bankAccountsService.remove(customerId, bankAccountId);
  }
}
