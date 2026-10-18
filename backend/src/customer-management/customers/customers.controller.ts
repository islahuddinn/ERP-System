import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuditModule, AuditAction } from "@prisma/tenant-client";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomerFiltersDto } from "./dto/customer-filters.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";

@ApiTags("Customers")
@Controller("customers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @RequirePermission("customers.create")
  @Auditable({ module: AuditModule.CUSTOMERS, action: AuditAction.CREATE })
  @ApiOperation({ summary: "Create a new customer" })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Get()
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get all customers with pagination and filters" })
  findAll(@Query() customerFiltersDto: CustomerFiltersDto) {
    return this.customersService.findAll(customerFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get minimal customer list for dropdowns" })
  dropdown() {
    return this.customersService.dropdown();
  }

  @Get("ledger-overview")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get all customers with ledger balance summary" })
  getLedgerOverview(@Query("search") search?: string) {
    return this.customersService.getLedgerOverview(search);
  }

  @Get(":customerId")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get customer by ID with recent sales" })
  findOne(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.customersService.findOne(customerId);
  }

  @Get(":customerId/stats")
  @RequirePermission("customers.read")
  @ApiOperation({ summary: "Get customer sales statistics" })
  getStats(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.customersService.getStats(customerId);
  }

  @Patch(":customerId")
  @RequirePermission("customers.update")
  @Auditable({ module: AuditModule.CUSTOMERS, action: AuditAction.UPDATE })
  @ApiOperation({ summary: "Update customer information" })
  update(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(customerId, updateCustomerDto);
  }

  @Delete(":customerId")
  @RequirePermission("customers.delete")
  @Auditable({ module: AuditModule.CUSTOMERS, action: AuditAction.DELETE })
  @ApiOperation({ summary: "Deactivate a customer" })
  softDelete(@Param("customerId", ParseUUIDPipe) customerId: string) {
    return this.customersService.softDelete(customerId);
  }
}
