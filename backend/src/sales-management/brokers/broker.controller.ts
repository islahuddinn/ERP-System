import {
  Body,
  Controller,
  Delete,
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
import { CreateBrokerDto } from "./dto/create-broker.dto";
import { UpdateBrokerDto } from "./dto/update-broker.dto";
import { BrokerFiltersDto } from "./dto/broker-filters.dto";
import { BrokerService } from "./broker.service";

@ApiTags("Sales Management - Brokers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("brokers")
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Get()
  @RequirePermission("broker.view")
  @ApiOperation({ summary: "List brokers with pagination and filters" })
  listBrokers(@Query() brokerFiltersDto: BrokerFiltersDto) {
    return this.brokerService.listBrokers(brokerFiltersDto);
  }

  @Get("commissions")
  @RequirePermission("broker.view")
  @ApiOperation({ summary: "List broker commissions" })
  listCommissions() {
    return this.brokerService.listCommissions();
  }

  @Get("suggest")
  @RequirePermission("broker.view")
  @ApiOperation({ summary: "Suggest brokers for a product or customer area" })
  suggestBrokers() {
    return this.brokerService.suggestBrokers();
  }

  @Get(":brokerId")
  @RequirePermission("broker.view")
  @ApiOperation({ summary: "Get broker by ID" })
  getBroker(@Param("brokerId", ParseUUIDPipe) brokerId: string) {
    return this.brokerService.getBroker(brokerId);
  }

  @Get(":brokerId/performance")
  @RequirePermission("broker.view")
  @ApiOperation({ summary: "Get broker sales and commission performance" })
  getBrokerPerformance(@Param("brokerId", ParseUUIDPipe) brokerId: string) {
    return this.brokerService.getBrokerPerformance(brokerId);
  }

  @Auditable({ module: AuditModule.BROKERS })
  @Post()
  @RequirePermission("broker.manage")
  @ApiOperation({ summary: "Create a new broker" })
  createBroker(@Body() createBrokerDto: CreateBrokerDto, @Req() req: RequestWithUser) {
    return this.brokerService.createBroker(createBrokerDto, req);
  }

  @Auditable({ module: AuditModule.BROKERS })
  @Patch(":brokerId")
  @RequirePermission("broker.manage")
  @ApiOperation({ summary: "Update a broker" })
  updateBroker(
    @Param("brokerId", ParseUUIDPipe) brokerId: string,
    @Body() updateBrokerDto: UpdateBrokerDto,
    @Req() req: RequestWithUser,
  ) {
    return this.brokerService.updateBroker(brokerId, updateBrokerDto, req);
  }

  @Auditable({ module: AuditModule.BROKERS })
  @Delete(":brokerId")
  @RequirePermission("broker.manage")
  @ApiOperation({ summary: "Delete a broker" })
  async deleteBroker(@Param("brokerId", ParseUUIDPipe) brokerId: string) {
    await this.brokerService.deleteBroker(brokerId);
    return { message: "Broker deleted successfully" };
  }
}
