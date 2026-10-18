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
import { QualityControlService } from "./quality-control.service";
import { CreateQualityControlDto, UpdateQualityControlDto } from "./dto/quality-control.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";

@ApiTags("Quality Control")
@Controller("quality-control/inspections")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QualityControlController {
  constructor(private readonly qualityControlService: QualityControlService) {}

  @Post()
  @ApiOperation({ summary: "Create quality inspection" })
  @ApiResponse({
    status: 201,
    description: "Quality inspection created successfully",
  })
  async create(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Body() createDto: CreateQualityControlDto,
  ) {
    return this.qualityControlService.create(tenantClient, createDto, req.tenantId, req.user?.id);
  }

  @Get()
  @ApiOperation({ summary: "Get all quality inspections" })
  @ApiQuery({ name: "batchId", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiQuery({ name: "qualityStatus", required: false })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiResponse({
    status: 200,
    description: "Quality inspections retrieved successfully",
  })
  async findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: any,
  ) {
    return this.qualityControlService.findAll(tenantClient, req.tenantId, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get quality inspection by ID" })
  @ApiParam({ name: "id", description: "Inspection ID" })
  @ApiResponse({
    status: 200,
    description: "Quality inspection retrieved successfully",
  })
  async findOne(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
  ) {
    return this.qualityControlService.findOne(tenantClient, id, req.tenantId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update quality inspection" })
  @ApiParam({ name: "id", description: "Inspection ID" })
  @ApiResponse({
    status: 200,
    description: "Quality inspection updated successfully",
  })
  async update(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
    @Body() updateDto: UpdateQualityControlDto,
  ) {
    return this.qualityControlService.update(
      tenantClient,
      id,
      updateDto,
      req.tenantId,
      req.user?.id,
    );
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete quality inspection" })
  @ApiParam({ name: "id", description: "Inspection ID" })
  @ApiResponse({
    status: 200,
    description: "Quality inspection deleted successfully",
  })
  async remove(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Param("id") id: string,
  ) {
    return this.qualityControlService.remove(tenantClient, id, req.tenantId);
  }
}
