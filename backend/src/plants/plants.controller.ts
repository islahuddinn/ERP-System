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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { PlantsService } from "./plants.service";
import { CreatePlantDto, UpdatePlantDto, PlantQueryDto, PlantStatsQueryDto } from "./dto/plant.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Plants")
@Controller("plants")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PlantsController {
  constructor(private readonly plantsService: PlantsService) {
    // #region agent log
    const fs = require("fs");
    const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    try {
      const logEntry =
        JSON.stringify({
          location: "plants.controller.ts:15",
          message: "PlantsController constructor called",
          data: { timestamp: new Date().toISOString() },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "D",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion
  }

  @Auditable({ module: AuditModule.PLANTS })
  @Post()
  @RequirePermission("plants.create")
  @ApiOperation({ summary: "Create a new plant" })
  @ApiResponse({
    status: 201,
    description: "The plant has been successfully created.",
  })
  @ApiResponse({ status: 400, description: "Bad Request." })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createPlantDto: CreatePlantDto,
    @Req() req: any,
  ) {
    // #region agent log
    const fs = require("fs");
    const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    try {
      const rawBody = JSON.stringify(req.body || {});
      const dtoKeys = Object.keys(createPlantDto);
      const rawBodyKeys = req.body ? Object.keys(req.body) : [];
      const logEntry =
        JSON.stringify({
          location: "plants.controller.ts:40",
          message: "POST /plants route handler called - BEFORE ValidationPipe",
          data: {
            rawRequestBody: rawBody,
            rawBodyKeys: rawBodyKeys,
            receivedDto: createPlantDto,
            dtoKeys: dtoKeys,
            fieldComparison: {
              name: {
                raw: req.body?.name,
                dto: createPlantDto.name,
                types: {
                  raw: typeof req.body?.name,
                  dto: typeof createPlantDto.name,
                },
              },
              code: {
                raw: req.body?.code,
                dto: createPlantDto.code,
                types: {
                  raw: typeof req.body?.code,
                  dto: typeof createPlantDto.code,
                },
              },
              locationId: {
                raw: req.body?.locationId,
                dto: createPlantDto.locationId,
                types: {
                  raw: typeof req.body?.locationId,
                  dto: typeof createPlantDto.locationId,
                },
                isUUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                  createPlantDto.locationId || "",
                ),
              },
              plantType: {
                raw: req.body?.plantType,
                dto: createPlantDto.plantType,
                types: {
                  raw: typeof req.body?.plantType,
                  dto: typeof createPlantDto.plantType,
                },
              },
              capacity: {
                raw: req.body?.capacity,
                dto: createPlantDto.capacity,
                types: {
                  raw: typeof req.body?.capacity,
                  dto: typeof createPlantDto.capacity,
                },
              },
              address: {
                raw: req.body?.address,
                dto: createPlantDto.address,
                types: {
                  raw: typeof req.body?.address,
                  dto: typeof createPlantDto.address,
                },
              },
            },
            optionalFields: {
              managerId: {
                value: createPlantDto.managerId,
                exists: "managerId" in createPlantDto,
                type: typeof createPlantDto.managerId,
                isUUID: createPlantDto.managerId
                  ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                      createPlantDto.managerId,
                    )
                  : null,
              },
              description: {
                value: createPlantDto.description,
                exists: "description" in createPlantDto,
                type: typeof createPlantDto.description,
              },
              contactPhone: {
                value: createPlantDto.contactPhone,
                exists: "contactPhone" in createPlantDto,
                type: typeof createPlantDto.contactPhone,
              },
            },
            allOptionalKeys: dtoKeys.filter(
              (k) =>
                !["name", "code", "locationId", "plantType", "capacity", "address"].includes(k),
            ),
            userId: req.user?.id,
            hasTenantClient: !!tenantClient,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "B",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion

    const userId = req.user?.id;
    return this.plantsService.create(tenantClient, createPlantDto, userId);
  }

  @Get()
  @RequirePermission("plants.read")
  @ApiOperation({ summary: "Get all plants with filtering and pagination" })
  @ApiResponse({ status: 200, description: "Return all plants." })
  findAll(@TenantClient() tenantClient: PrismaClient, @Query() query: PlantQueryDto) {
    // #region agent log
    const fs = require("fs");
    const logPath = "c:\\Users\\Mubeen\\factory_distribution_system\\.cursor\\debug.log";
    try {
      const logEntry =
        JSON.stringify({
          location: "plants.controller.ts:40",
          message: "GET /plants route handler called",
          data: { query, hasTenantClient: !!tenantClient },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "D",
        }) + "\n";
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (e) {}
    // #endregion

    return this.plantsService.findAll(tenantClient, query);
  }

  @Get("stats")
  @RequirePermission("plants.read")
  @ApiOperation({ summary: "Get plant statistics" })
  @ApiResponse({ status: 200, description: "Return plant statistics." })
  getStats(@TenantClient() tenantClient: PrismaClient, @Query() query: PlantStatsQueryDto) {
    return this.plantsService.getStats(tenantClient, query);
  }

  @Get(":id")
  @RequirePermission("plants.read")
  @ApiOperation({ summary: "Get a plant by id" })
  @ApiResponse({ status: 200, description: "Return the plant." })
  @ApiResponse({ status: 404, description: "Plant not found." })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.plantsService.findOne(tenantClient, id);
  }

  @Auditable({ module: AuditModule.PLANTS })
  @Patch(":id")
  @RequirePermission("plants.update")
  @ApiOperation({ summary: "Update a plant" })
  @ApiResponse({
    status: 200,
    description: "The plant has been successfully updated.",
  })
  @ApiResponse({ status: 404, description: "Plant not found." })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updatePlantDto: UpdatePlantDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.plantsService.update(tenantClient, id, updatePlantDto, userId);
  }

  @Auditable({ module: AuditModule.PLANTS })
  @Delete(":id")
  @RequirePermission("plants.delete")
  @ApiOperation({ summary: "Delete a plant" })
  @ApiResponse({
    status: 200,
    description: "The plant has been successfully deleted.",
  })
  @ApiResponse({ status: 404, description: "Plant not found." })
  @ApiResponse({
    status: 409,
    description: "Cannot delete plant with production lines, machines, or work orders.",
  })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.plantsService.remove(tenantClient, id);
  }
}
