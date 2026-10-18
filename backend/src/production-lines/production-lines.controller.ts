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
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ProductionLinesService } from "./production-lines.service";
import {
  CreateProductionLineDto,
  UpdateProductionLineDto,
  ProductionLineQueryDto,
  ProductionLineStatsQueryDto,
  UpdateProductionLineLoadDto,
} from "./dto/production-line.dto";
import { ProductionLineStatus } from "./dto/production-line.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Production Lines")
@Controller("production-lines")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProductionLinesController {
  constructor(private readonly productionLinesService: ProductionLinesService) {}

  @Auditable({ module: AuditModule.PRODUCTION_LINES })
  @Post()
  @RequirePermission("production_lines.create")
  @ApiOperation({ summary: "Create a new production line" })
  @ApiResponse({
    status: 201,
    description: "Production line created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Plant or supervisor not found" })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createProductionLineDto: CreateProductionLineDto,
    @Request() req,
  ) {
    return this.productionLinesService.create(
      tenantClient,
      createProductionLineDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @RequirePermission("production_lines.read")
  @ApiOperation({ summary: "Get all production lines" })
  @ApiResponse({
    status: 200,
    description: "Production lines retrieved successfully",
  })
  @ApiQuery({ name: "status", required: false, enum: ProductionLineStatus })
  @ApiQuery({ name: "lineType", required: false, type: String })
  @ApiQuery({ name: "plantId", required: false, type: String })
  @ApiQuery({ name: "supervisorId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: String })
  findAll(@Query() query: ProductionLineQueryDto, @Request() req) {
    return this.productionLinesService.findAll(req.user.tenantId, query);
  }

  @Get("stats")
  @RequirePermission("production_lines.read")
  @ApiOperation({ summary: "Get production line statistics" })
  @ApiResponse({
    status: 200,
    description: "Production line statistics retrieved successfully",
  })
  @ApiQuery({ name: "plantId", required: false, type: String })
  @ApiQuery({ name: "supervisorId", required: false, type: String })
  getStats(@Query() query: ProductionLineStatsQueryDto, @Request() req) {
    return this.productionLinesService.getProductionLineStats(req.user.tenantId, query);
  }

  @Get(":id")
  @RequirePermission("production_lines.read")
  @ApiOperation({ summary: "Get a production line by ID" })
  @ApiResponse({
    status: 200,
    description: "Production line retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Production line not found" })
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Request() req) {
    return this.productionLinesService.findOne(id, req.user.tenantId);
  }

  @Auditable({ module: AuditModule.PRODUCTION_LINES })
  @Patch(":id")
  @RequirePermission("production_lines.update")
  @ApiOperation({ summary: "Update a production line" })
  @ApiResponse({
    status: 200,
    description: "Production line updated successfully",
  })
  @ApiResponse({ status: 404, description: "Production line not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body() updateProductionLineDto: UpdateProductionLineDto,
    @Request() req,
  ) {
    return this.productionLinesService.update(
      tenantClient,
      id,
      updateProductionLineDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.PRODUCTION_LINES })
  @Patch(":id/status")
  @RequirePermission("production_lines.update")
  @ApiOperation({ summary: "Update production line status" })
  @ApiResponse({
    status: 200,
    description: "Production line status updated successfully",
  })
  @ApiResponse({ status: 404, description: "Production line not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  updateStatus(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body("status") status: ProductionLineStatus,
    @Request() req,
  ) {
    return this.productionLinesService.updateStatus(
      tenantClient,
      id,
      status,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.PRODUCTION_LINES })
  @Patch(":id/load")
  @RequirePermission("production_lines.update")
  @ApiOperation({ summary: "Update production line load" })
  @ApiResponse({
    status: 200,
    description: "Production line load updated successfully",
  })
  @ApiResponse({ status: 404, description: "Production line not found" })
  @ApiResponse({ status: 400, description: "Load exceeds capacity" })
  @ApiParam({ name: "id", type: String })
  updateLoad(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body() updateDto: UpdateProductionLineLoadDto,
    @Request() req,
  ) {
    return this.productionLinesService.updateLoad(
      tenantClient,
      id,
      updateDto.currentLoad,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.PRODUCTION_LINES })
  @Delete(":id")
  @RequirePermission("production_lines.delete")
  @ApiOperation({ summary: "Delete a production line" })
  @ApiResponse({
    status: 200,
    description: "Production line deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Production line not found" })
  @ApiResponse({ status: 400, description: "Cannot delete production line" })
  @ApiParam({ name: "id", type: String })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req) {
    return this.productionLinesService.remove(tenantClient, id, req.user.tenantId, req.user.id);
  }
}
