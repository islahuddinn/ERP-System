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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { MachinesService } from "./machines.service";
import {
  CreateMachineDto,
  UpdateMachineDto,
  MachineQueryDto,
  MachineStatsQueryDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  MachineStatus,
  MaintenanceStatus,
} from "./dto/machine.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Machines")
@Controller("machines")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Auditable({ module: AuditModule.MACHINES })
  @Post()
  @RequirePermission("machines.create")
  @ApiOperation({ summary: "Create a new machine" })
  @ApiResponse({ status: 201, description: "Machine created successfully." })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createDto: CreateMachineDto,
    @Request() req,
  ) {
    return this.machinesService.create(tenantClient, createDto, req.user.tenantId, req.user.id);
  }

  @Get()
  @RequirePermission("machines.read")
  @ApiOperation({ summary: "Get all machines" })
  findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query() query: MachineQueryDto,
    @Request() req,
  ) {
    return this.machinesService.findAll(tenantClient, req.user.tenantId, query);
  }

  @Get("stats")
  @RequirePermission("machines.read")
  @ApiOperation({ summary: "Get machine stats" })
  getStats(@Query() query: MachineStatsQueryDto, @Request() req) {
    return this.machinesService.getStats(req.user.tenantId, query);
  }

  @Get("maintenance/upcoming")
  @RequirePermission("machines.read")
  @ApiOperation({ summary: "Get upcoming maintenance" })
  getUpcomingMaintenance(@Query("days") days: number, @Request() req) {
    return this.machinesService.getUpcomingMaintenance(req.user.tenantId, days);
  }

  @Get("maintenance/stats")
  @RequirePermission("machines.read")
  @ApiOperation({ summary: "Get maintenance stats" })
  @ApiQuery({ name: "machineId", required: false })
  getMaintenanceStats(@Query("machineId") machineId: string, @Request() req) {
    return this.machinesService.getMaintenanceStats(req.user.tenantId, machineId);
  }

  @Get(":id")
  @RequirePermission("machines.read")
  @ApiOperation({ summary: "Get a machine by id" })
  findOne(@Param("id") id: string, @Request() req) {
    return this.machinesService.findOne(id, req.user.tenantId);
  }

  @Auditable({ module: AuditModule.MACHINES })
  @Patch(":id")
  @RequirePermission("machines.update")
  @ApiOperation({ summary: "Update a machine" })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateDto: UpdateMachineDto,
    @Request() req,
  ) {
    return this.machinesService.update(tenantClient, id, updateDto, req.user.tenantId, req.user.id);
  }

  @Auditable({ module: AuditModule.MACHINES })
  @Patch(":id/status")
  @RequirePermission("machines.update")
  @ApiOperation({ summary: "Update machine status" })
  updateStatus(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("status") status: MachineStatus,
    @Request() req,
  ) {
    return this.machinesService.updateStatus(
      tenantClient,
      id,
      status,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MACHINES })
  @Delete(":id")
  @RequirePermission("machines.delete")
  @ApiOperation({ summary: "Delete a machine" })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req) {
    return this.machinesService.remove(tenantClient, id, req.user.tenantId, req.user.id);
  }

  // Maintenance Routes
  @Auditable({ module: AuditModule.MACHINES, entity: "MaintenanceRecord" })
  @Post("maintenance")
  @RequirePermission("machines.update")
  @ApiOperation({ summary: "Create maintenance record" })
  createMaintenance(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createDto: CreateMaintenanceDto,
    @Request() req,
  ) {
    return this.machinesService.createMaintenance(
      tenantClient,
      createDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MACHINES, entity: "MaintenanceRecord" })
  @Patch("maintenance/:id")
  @RequirePermission("machines.update")
  @ApiOperation({ summary: "Update maintenance record" })
  updateMaintenance(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateDto: UpdateMaintenanceDto,
    @Request() req,
  ) {
    return this.machinesService.updateMaintenance(
      tenantClient,
      id,
      updateDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MACHINES, entity: "MaintenanceRecord" })
  @Patch("maintenance/:id/status")
  @RequirePermission("machines.update")
  @ApiOperation({ summary: "Update maintenance status" })
  updateMaintenanceStatus(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("status") status: MaintenanceStatus,
    @Request() req,
  ) {
    return this.machinesService.updateMaintenanceStatus(
      tenantClient,
      id,
      status,
      req.user.tenantId,
      req.user.id,
    );
  }
}
