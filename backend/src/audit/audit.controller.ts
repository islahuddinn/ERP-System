import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditService } from "./audit.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { FilterAuditLogsDto } from "./dto/filter-audit-logs.dto";

@ApiTags("Audit Logs")
@Controller("audit-logs")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission("audit.view")
  @ApiOperation({ summary: "List audit logs with filters and pagination" })
  findAll(@TenantClient() tenantClient: PrismaClient, @Query() query: FilterAuditLogsDto) {
    return this.auditService.findAll(tenantClient, query);
  }

  @Get("summary")
  @RequirePermission("audit.view")
  @ApiOperation({ summary: "Dashboard summary — totals by action and module" })
  getSummary(@TenantClient() tenantClient: PrismaClient) {
    return this.auditService.getSummary(tenantClient);
  }

  @Get("entity/:entityName/:entityId")
  @RequirePermission("audit.view")
  @ApiOperation({ summary: "Full history of a single record across all time" })
  getEntityHistory(
    @TenantClient() tenantClient: PrismaClient,
    @Param("entityName") entityName: string,
    @Param("entityId") entityId: string,
  ) {
    return this.auditService.findByEntity(tenantClient, entityName, entityId);
  }

  @Get(":id")
  @RequirePermission("audit.view")
  @ApiOperation({ summary: "Get a single audit log entry with full diff" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.auditService.findOne(tenantClient, id);
  }
}
