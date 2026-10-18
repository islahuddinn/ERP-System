import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { CustomerReturnsService } from "./customer-returns.service";
import { CreateCustomerReturnDto } from "./dto/create-customer-return.dto";
import { CustomerReturnFiltersDto } from "./dto/customer-return-filters.dto";

@ApiTags("Customer Management - Customer Returns")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/customer-returns")
export class CustomerReturnsController {
  constructor(private readonly customerReturnsService: CustomerReturnsService) {}

  @Get()
  @RequirePermission("customer-return.view")
  @ApiOperation({ summary: "List customer returns with pagination and filters" })
  listCustomerReturns(@Query() customerReturnFiltersDto: CustomerReturnFiltersDto) {
    return this.customerReturnsService.listCustomerReturns(customerReturnFiltersDto);
  }

  @Get(":returnId")
  @RequirePermission("customer-return.view")
  @ApiOperation({ summary: "Get a customer return by ID" })
  getCustomerReturn(@Param("returnId", ParseUUIDPipe) returnId: string) {
    return this.customerReturnsService.getCustomerReturn(returnId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_RETURNS })
  @Post()
  @RequirePermission("customer-return.create")
  @ApiOperation({
    summary:
      "Record a shop returning goods to a sales person, against a specific delivery item — price is copied from that item, never re-entered. Created PENDING; no stock or ledger changes until approved",
  })
  createCustomerReturn(
    @Body() createCustomerReturnDto: CreateCustomerReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerReturnsService.createCustomerReturn(createCustomerReturnDto, req);
  }

  @Auditable({ module: AuditModule.CUSTOMER_RETURNS })
  @Patch(":returnId/approve")
  @RequirePermission("customer-return.approve")
  @ApiOperation({
    summary:
      "Approve a pending return — restores stock to the delivering Sales Person's branch and posts the shop's ledger credit",
  })
  approveCustomerReturn(
    @Param("returnId", ParseUUIDPipe) returnId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.customerReturnsService.approveCustomerReturn(returnId, req);
  }

  @Auditable({ module: AuditModule.CUSTOMER_RETURNS })
  @Patch(":returnId/reject")
  @RequirePermission("customer-return.approve")
  @ApiOperation({ summary: "Reject a pending return — no stock or ledger changes" })
  rejectCustomerReturn(
    @Param("returnId", ParseUUIDPipe) returnId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.customerReturnsService.rejectCustomerReturn(returnId, req);
  }
}
