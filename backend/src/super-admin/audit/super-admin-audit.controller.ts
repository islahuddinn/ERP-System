import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { SuperAdminAuditService } from "./super-admin-audit.service";
import { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { SuperAdminJwtAuthGuard } from "../auth/guards/super-admin-jwt-auth.guard";

@ApiTags(`Super Admin - Audit Logs`)
@Controller(`super-admin/audit-logs`)
@UseGuards(SuperAdminJwtAuthGuard)
@ApiBearerAuth()
export class SuperAdminAuditController {
  constructor(private readonly auditService: SuperAdminAuditService) {}

  @Get()
  findAll(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(query);
  }

  @Get(`:auditLogId`)
  findOne(@Param(`auditLogId`) auditLogId: string) {
    return this.auditService.findOne(auditLogId);
  }
}
