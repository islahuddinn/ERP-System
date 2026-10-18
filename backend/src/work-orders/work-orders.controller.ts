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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { WorkOrdersService } from "./work-orders.service";
import { CreateWorkOrderDto, UpdateWorkOrderDto } from "./dto/work-order.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";

@ApiTags("Work Orders")
@Controller("work-orders")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create work order" })
  @ApiResponse({ status: 201, description: "Work order created successfully" })
  async create(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Body() createDto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.create(tenantClient, createDto, req.tenantId);
  }

  @Get()
  @ApiOperation({ summary: "Get all work orders" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "productionOrderId", required: false })
  @ApiQuery({ name: "assignedToId", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({
    status: 200,
    description: "Work orders retrieved successfully",
  })
  async findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: any,
  ) {
    return this.workOrdersService.findAll(tenantClient, req.tenantId, query);
  }

  @Get("schedule")
  @ApiOperation({ summary: "Get work order schedule" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({
    status: 200,
    description: "Work order schedule retrieved successfully",
  })
  async getSchedule(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.workOrdersService.getSchedule(tenantClient, req.tenantId, startDate, endDate);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get work order by ID" })
  @ApiParam({ name: "id", description: "Work order ID" })
  @ApiResponse({
    status: 200,
    description: "Work order retrieved successfully",
  })
  async findOne(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
  ) {
    return this.workOrdersService.findOne(tenantClient, id, req.tenantId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update work order" })
  @ApiParam({ name: "id", description: "Work order ID" })
  @ApiResponse({ status: 200, description: "Work order updated successfully" })
  async update(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
    @Body() updateDto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(tenantClient, id, updateDto, req.tenantId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete work order" })
  @ApiParam({ name: "id", description: "Work order ID" })
  @ApiResponse({ status: 200, description: "Work order deleted successfully" })
  async remove(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
  ) {
    return this.workOrdersService.remove(tenantClient, id, req.tenantId);
  }
}
