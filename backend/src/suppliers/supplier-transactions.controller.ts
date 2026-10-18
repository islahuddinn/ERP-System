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
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SupplierTransactionsService } from "./supplier-transactions.service";
import { CreateSupplierTransactionDto } from "./dto/create-supplier-transaction.dto";
import { UpdateSupplierTransactionDto } from "./dto/update-supplier-transaction.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";

@ApiTags("Supplier Transactions")
@Controller("suppliers/:supplierId/transactions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SupplierTransactionsController {
  constructor(private readonly transactionsService: SupplierTransactionsService) {}

  @Post()
  @RequirePermission("suppliers.create")
  @ApiOperation({
    summary: "Record a manual transaction for a supplier (cash payment, adjustment, etc.)",
  })
  create(
    @Param("supplierId") supplierId: string,
    @Body() dto: CreateSupplierTransactionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.transactionsService.create(supplierId, dto, req);
  }

  @Get()
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get all transactions for a supplier" })
  findAll(@Param("supplierId") supplierId: string, @Query() queryDto: TransactionQueryDto) {
    return this.transactionsService.findAll(supplierId, queryDto);
  }

  @Get(":id")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get a single transaction" })
  findOne(@Param("supplierId") supplierId: string, @Param("id") id: string) {
    return this.transactionsService.findOne(supplierId, id);
  }

  @Patch(":id")
  @RequirePermission("suppliers.update")
  @ApiOperation({ summary: "Update a transaction" })
  update(
    @Param("supplierId") supplierId: string,
    @Param("id") id: string,
    @Body() dto: UpdateSupplierTransactionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.transactionsService.update(supplierId, id, dto, req);
  }

  @Delete(":id")
  @RequirePermission("suppliers.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a transaction" })
  remove(@Param("supplierId") supplierId: string, @Param("id") id: string) {
    return this.transactionsService.remove(supplierId, id);
  }
}
