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
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger";
import { MaterialRequestsService } from "./material-requests.service";
import {
  CreateMaterialRequestDto,
  UpdateMaterialRequestDto,
  MaterialRequestQueryDto,
} from "./dto/material-request.dto";
import { MaterialRequestStatus } from "./dto/material-request.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Material Requests")
@Controller("material-requests")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialRequestsController {
  constructor(private readonly materialRequestsService: MaterialRequestsService) {}

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Post()
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Create a new material request" })
  @ApiResponse({
    status: 201,
    description: "Material request created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({
    status: 404,
    description: "Plant, production order, or material not found",
  })
  async create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createMaterialRequestDto: CreateMaterialRequestDto,
    @Request() req,
  ) {
    try {
      const logger = new Logger(MaterialRequestsController.name);
      logger.error(
        "[MATERIAL-REQUEST-CONTROLLER] Received create request:",
        JSON.stringify(
          {
            hasTenantClient: !!tenantClient,
            hasDto: !!createMaterialRequestDto,
            tenantId: req.user?.tenantId,
            userId: req.user?.id,
            dtoKeys: createMaterialRequestDto ? Object.keys(createMaterialRequestDto) : [],
            materialsCount: createMaterialRequestDto?.materials?.length,
            requestBody: createMaterialRequestDto,
          },
          null,
          2,
        ),
      );
      return await this.materialRequestsService.create(
        tenantClient,
        createMaterialRequestDto,
        req.user.tenantId,
        req.user.id,
      );
    } catch (error: any) {
      const logger = new Logger(MaterialRequestsController.name);
      logger.error(
        "[MATERIAL-REQUEST-CONTROLLER] Error in create: " +
          JSON.stringify(
            {
              error: error.message,
              stack: error.stack,
              errorName: error.constructor.name,
              statusCode: error.statusCode,
              response: error.response,
            },
            null,
            2,
          ),
      );
      throw error;
    }
  }

  @Get()
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get all material requests" })
  @ApiResponse({
    status: 200,
    description: "Material requests retrieved successfully",
  })
  @ApiQuery({ name: "status", required: false, enum: MaterialRequestStatus })
  @ApiQuery({ name: "requestType", required: false, type: String })
  @ApiQuery({ name: "plantId", required: false, type: String })
  @ApiQuery({ name: "requestedById", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: String })
  findAll(@Query() query: MaterialRequestQueryDto, @Request() req) {
    return this.materialRequestsService.findAll(req.user.tenantId, query);
  }

  @Get("stats")
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get material request statistics" })
  @ApiResponse({
    status: 200,
    description: "Material request statistics retrieved successfully",
  })
  @ApiQuery({ name: "plantId", required: false, type: String })
  getStats(@Request() req, @Query("plantId") plantId?: string) {
    return this.materialRequestsService.getMaterialRequestStats(req.user.tenantId, plantId);
  }

  @Get("warehouse/:warehouseId/products")
  @RequirePermission("raw-materials.read")
  @ApiOperation({
    summary: "Get products available in a warehouse for material requests",
  })
  @ApiResponse({
    status: 200,
    description: "Products with available quantities retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  @ApiParam({ name: "warehouseId", type: String, description: "Warehouse ID" })
  async getWarehouseProducts(
    @TenantClient() tenantClient: PrismaClient,
    @Param("warehouseId") warehouseId: string,
    @Request() req,
  ) {
    return this.materialRequestsService.getWarehouseProducts(
      tenantClient,
      warehouseId,
      req.user.tenantId,
    );
  }

  @Get(":id")
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get a material request by ID" })
  @ApiResponse({
    status: 200,
    description: "Material request retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Request() req) {
    return this.materialRequestsService.findOne(id, req.user.tenantId);
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Update a material request" })
  @ApiResponse({
    status: 200,
    description: "Material request updated successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body() updateMaterialRequestDto: UpdateMaterialRequestDto,
    @Request() req,
  ) {
    return this.materialRequestsService.update(
      tenantClient,
      id,
      updateMaterialRequestDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id/approve")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Approve a material request" })
  @ApiResponse({
    status: 200,
    description: "Material request approved successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Cannot approve material request" })
  @ApiParam({ name: "id", type: String })
  approve(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("comments") comments: string,
    @Request() req,
  ) {
    return this.materialRequestsService.approveRequest(
      tenantClient,
      id,
      req.user.id,
      comments,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id/submit")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Submit a draft material request for approval" })
  @ApiResponse({
    status: 200,
    description: "Material request submitted successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Cannot submit material request" })
  @ApiParam({ name: "id", type: String })
  submit(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req) {
    return this.materialRequestsService.submitRequest(
      tenantClient,
      id,
      req.user.id,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id/reject")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Reject a material request" })
  @ApiResponse({
    status: 200,
    description: "Material request rejected successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Cannot reject material request" })
  @ApiParam({ name: "id", type: String })
  reject(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("comments") comments: string,
    @Request() req,
  ) {
    return this.materialRequestsService.rejectRequest(
      tenantClient,
      id,
      req.user.id,
      comments,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id/fulfill")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Fulfill a material request" })
  @ApiResponse({
    status: 200,
    description: "Material request fulfilled successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Cannot fulfill material request" })
  @ApiParam({ name: "id", type: String })
  fulfill(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() body: { warehouseId?: string },
    @Request() req,
  ) {
    return this.materialRequestsService.fulfillRequest(
      tenantClient,
      id,
      req.user.id,
      req.user.tenantId,
      body.warehouseId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Patch(":id/status")
  @RequirePermission("raw-materials.manage_stock")
  @ApiOperation({ summary: "Update material request status" })
  @ApiResponse({
    status: 200,
    description: "Material request status updated successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  updateStatus(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body("status") status: MaterialRequestStatus,
    @Request() req,
  ) {
    return this.materialRequestsService.update(
      tenantClient,
      id,
      { status },
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_REQUESTS })
  @Delete(":id")
  @RequirePermission("raw-materials.delete")
  @ApiOperation({ summary: "Delete a material request" })
  @ApiResponse({
    status: 200,
    description: "Material request deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Material request not found" })
  @ApiResponse({ status: 400, description: "Cannot delete material request" })
  @ApiParam({ name: "id", type: String })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req) {
    return this.materialRequestsService.remove(tenantClient, id, req.user.tenantId, req.user.id);
  }
}
