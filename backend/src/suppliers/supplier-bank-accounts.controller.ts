import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { SupplierBankAccountsService } from "./supplier-bank-accounts.service";
import { CreateSupplierBankAccountDto } from "./dto/create-supplier-bank-account.dto";
import { UpdateSupplierBankAccountDto } from "./dto/update-supplier-bank-account.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../common/interfaces";

@ApiTags("Supplier Bank Accounts")
@Controller("suppliers/:supplierId/bank-accounts")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SupplierBankAccountsController {
  constructor(private readonly bankAccountsService: SupplierBankAccountsService) {}

  @Post()
  @RequirePermission("suppliers.create")
  @Auditable({ module: AuditModule.SUPPLIERS })
  @ApiOperation({ summary: "Add a bank account to a supplier" })
  create(
    @Param("supplierId") supplierId: string,
    @Body() dto: CreateSupplierBankAccountDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.create(supplierId, dto, req);
  }

  @Get()
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "List all bank accounts for a supplier" })
  findAll(@Param("supplierId") supplierId: string) {
    return this.bankAccountsService.findAll(supplierId);
  }

  @Get(":bankAccountId")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get a single supplier bank account" })
  findOne(
    @Param("supplierId") supplierId: string,
    @Param("bankAccountId") bankAccountId: string,
  ) {
    return this.bankAccountsService.findOne(supplierId, bankAccountId);
  }

  @Patch(":bankAccountId")
  @RequirePermission("suppliers.update")
  @Auditable({ module: AuditModule.SUPPLIERS })
  @ApiOperation({ summary: "Update a supplier bank account" })
  update(
    @Param("supplierId") supplierId: string,
    @Param("bankAccountId") bankAccountId: string,
    @Body() dto: UpdateSupplierBankAccountDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.update(supplierId, bankAccountId, dto, req);
  }

  @Patch(":bankAccountId/set-default")
  @RequirePermission("suppliers.update")
  @Auditable({ module: AuditModule.SUPPLIERS })
  @ApiOperation({ summary: "Mark a bank account as the default for this supplier" })
  setDefault(
    @Param("supplierId") supplierId: string,
    @Param("bankAccountId") bankAccountId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.bankAccountsService.setDefault(supplierId, bankAccountId, req);
  }

  @Delete(":bankAccountId")
  @RequirePermission("suppliers.delete")
  @Auditable({ module: AuditModule.SUPPLIERS })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Permanently delete a supplier bank account" })
  remove(
    @Param("supplierId") supplierId: string,
    @Param("bankAccountId") bankAccountId: string,
  ) {
    return this.bankAccountsService.remove(supplierId, bankAccountId);
  }
}
