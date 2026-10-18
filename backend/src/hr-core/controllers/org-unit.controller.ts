import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { OrgUnitService } from "../services/org-unit.service";
import { CreateOrgUnitDto } from "../dto/create-org-unit.dto";
import { UpdateOrgUnitDto } from "../dto/update-org-unit.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
  };
}

@ApiTags("HR Core - Org Units")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/core/org-units")
export class OrgUnitController {
  constructor(private readonly orgUnitService: OrgUnitService) {}

  @Get()
  @RequirePermission("hr.view")
  async listOrgUnits(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.orgUnitService.listOrgUnits(tenantId);
  }

  @Get("tree")
  @RequirePermission("hr.view")
  async getOrgTree(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.orgUnitService.getOrgTree(tenantId);
  }

  @Get("org-chart")
  @RequirePermission("hr.view")
  async getOrgChart(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.orgUnitService.getOrgChart(tenantId);
  }

  @Get(":id")
  @RequirePermission("hr.view")
  async getOrgUnit(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.orgUnitService.getOrgUnit(tenantId, id);
  }

  @Post()
  @RequirePermission("hr.manage_employees")
  async createOrgUnit(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrgUnitDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.orgUnitService.createOrgUnit(tenantId, dto, userId);
  }

  @Patch(":id")
  @RequirePermission("hr.manage_employees")
  async updateOrgUnit(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateOrgUnitDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.orgUnitService.updateOrgUnit(tenantId, id, dto, userId);
  }

  @Delete(":id")
  @RequirePermission("hr.manage_employees")
  async deleteOrgUnit(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    await this.orgUnitService.deleteOrgUnit(tenantId, id);
    return { success: true };
  }
}

