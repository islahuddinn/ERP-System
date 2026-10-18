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
import { CustomerDeliveriesService } from "./customer-deliveries.service";
import { CreateCustomerDeliveryDto } from "./dto/create-customer-delivery.dto";
import { CustomerDeliveryFiltersDto } from "./dto/customer-delivery-filters.dto";
import { MarkCustomerDeliveryDeliveredDto } from "./dto/mark-customer-delivery-delivered.dto";

@ApiTags("Customer Management - Customer Deliveries")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/customer-deliveries")
export class CustomerDeliveriesController {
  constructor(private readonly customerDeliveriesService: CustomerDeliveriesService) {}

  @Get()
  @RequirePermission("customer-delivery.view")
  @ApiOperation({ summary: "List customer deliveries with pagination and filters" })
  listCustomerDeliveries(@Query() customerDeliveryFiltersDto: CustomerDeliveryFiltersDto) {
    return this.customerDeliveriesService.listCustomerDeliveries(customerDeliveryFiltersDto);
  }

  @Get(":deliveryId")
  @RequirePermission("customer-delivery.view")
  @ApiOperation({ summary: "Get a customer delivery by ID" })
  getCustomerDelivery(@Param("deliveryId", ParseUUIDPipe) deliveryId: string) {
    return this.customerDeliveriesService.getCustomerDelivery(deliveryId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_DELIVERIES })
  @Post()
  @RequirePermission("customer-delivery.create")
  @ApiOperation({ summary: "Record a delivery from a sales person to a shop" })
  createCustomerDelivery(
    @Body() createCustomerDeliveryDto: CreateCustomerDeliveryDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerDeliveriesService.createCustomerDelivery(createCustomerDeliveryDto, req);
  }

  @Auditable({ module: AuditModule.CUSTOMER_DELIVERIES })
  @Patch(":deliveryId/deliver")
  @RequirePermission("customer-delivery.deliver")
  @ApiOperation({
    summary:
      "Mark a pending delivery as delivered — debits the shop's ledger and updates the linked order",
  })
  markAsDelivered(
    @Param("deliveryId", ParseUUIDPipe) deliveryId: string,
    @Body() markCustomerDeliveryDeliveredDto: MarkCustomerDeliveryDeliveredDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerDeliveriesService.markAsDelivered(
      deliveryId,
      req,
      markCustomerDeliveryDeliveredDto.items,
    );
  }
}
