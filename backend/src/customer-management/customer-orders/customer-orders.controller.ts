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
import { CustomerOrdersService } from "./customer-orders.service";
import { CreateCustomerOrderDto } from "./dto/create-customer-order.dto";
import { CustomerOrderFiltersDto } from "./dto/customer-order-filters.dto";

@ApiTags("Customer Management - Customer Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/customer-orders")
export class CustomerOrdersController {
  constructor(private readonly customerOrdersService: CustomerOrdersService) {}

  @Get()
  @RequirePermission("customer-order.view")
  @ApiOperation({ summary: "List customer orders with pagination and filters" })
  listCustomerOrders(@Query() customerOrderFiltersDto: CustomerOrderFiltersDto) {
    return this.customerOrdersService.listCustomerOrders(customerOrderFiltersDto);
  }

  @Get(":orderId")
  @RequirePermission("customer-order.view")
  @ApiOperation({ summary: "Get a customer order by ID, with its items" })
  getCustomerOrder(@Param("orderId", ParseUUIDPipe) orderId: string) {
    return this.customerOrdersService.getCustomerOrder(orderId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_ORDERS })
  @Post()
  @RequirePermission("customer-order.create")
  @ApiOperation({ summary: "Book an order from a shop visit — nothing is delivered yet" })
  createCustomerOrder(
    @Body() createCustomerOrderDto: CreateCustomerOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerOrdersService.createCustomerOrder(createCustomerOrderDto, req);
  }
}
