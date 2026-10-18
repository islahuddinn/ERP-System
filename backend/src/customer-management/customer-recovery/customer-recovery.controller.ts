import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CustomerRecoveryService } from "./customer-recovery.service";
import { CreateCustomerRecoveryDto } from "./dto/create-customer-recovery.dto";
import { CustomerRecoveryFiltersDto } from "./dto/customer-recovery-filters.dto";

@ApiTags("Customer Management - Customer Recovery")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/customer-recovery")
export class CustomerRecoveryController {
  constructor(private readonly customerRecoveryService: CustomerRecoveryService) {}

  @Get()
  @RequirePermission("customer-recovery.view")
  @ApiOperation({ summary: "List customer recoveries with pagination and filters" })
  listCustomerRecoveries(@Query() customerRecoveryFiltersDto: CustomerRecoveryFiltersDto) {
    return this.customerRecoveryService.listCustomerRecoveries(customerRecoveryFiltersDto);
  }

  @Get(":recoveryId")
  @RequirePermission("customer-recovery.view")
  @ApiOperation({ summary: "Get a customer recovery by ID" })
  getCustomerRecovery(@Param("recoveryId", ParseUUIDPipe) recoveryId: string) {
    return this.customerRecoveryService.getCustomerRecovery(recoveryId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_RECOVERIES })
  @Post()
  @RequirePermission("customer-recovery.create")
  @ApiOperation({ summary: "Record a payment collected from a shop by a sales person" })
  createCustomerRecovery(
    @Body() createCustomerRecoveryDto: CreateCustomerRecoveryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerRecoveryService.createCustomerRecovery(createCustomerRecoveryDto, req);
  }
}
