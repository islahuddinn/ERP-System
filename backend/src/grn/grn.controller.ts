import { Controller, Get, Post, Body, Param, UseGuards, Query, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { GrnService } from "./grn.service";
import { CreateGrnDto, GrnQueryDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("GRN")
@Controller("grn")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Post()
  @Auditable({ module: AuditModule.GRN, entity: "GRN" })
  @ApiOperation({ summary: "Create a new GRN with items" })
  @RequirePermission("grn.create")
  create(@Body() createDto: CreateGrnDto, @Req() req: RequestWithUser) {
    return this.grnService.create(createDto, req);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get GRN dashboard statistics" })
  @RequirePermission("grn.read")
  getStats() {
    return this.grnService.getStats();
  }

  @Get()
  @ApiOperation({ summary: "Get all GRNs with optional filters" })
  @RequirePermission("grn.read")
  findAll(@Query() query: GrnQueryDto) {
    return this.grnService.findAll(query);
  }

  @Get(":grnId")
  @ApiOperation({ summary: "Get a single GRN by ID" })
  @RequirePermission("grn.read")
  findOne(@Param("grnId") grnId: string) {
    return this.grnService.findOne(grnId);
  }
}
