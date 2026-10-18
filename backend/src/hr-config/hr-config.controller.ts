import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { HrConfigService } from "./hr-config.service";
import { CreateTaxRuleDto } from "./dto/create-tax-rule.dto";
import { UpdateTaxRuleDto } from "./dto/update-tax-rule.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { CreateDeductionRuleDto } from "./dto/create-deduction-rule.dto";
import { UpdateDeductionRuleDto } from "./dto/update-deduction-rule.dto";
import { CreateWorkingCalendarDto } from "./dto/create-working-calendar.dto";
import { UpdateWorkingCalendarDto } from "./dto/update-working-calendar.dto";
import { CreateSalaryComponentDto } from "./dto/create-salary-component.dto";
import { UpdateSalaryComponentDto } from "./dto/update-salary-component.dto";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
  };
}

@ApiTags("HR Config")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/config")
export class HrConfigController {
  constructor(private readonly hrConfigService: HrConfigService) {}

  @Get("tax-rules")
  @RequirePermission("hr.manage")
  async listTaxRules(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.listTaxRules(tenantId);
  }

  @Post("tax-rules")
  @RequirePermission("hr.manage")
  async createTaxRule(@Req() req: AuthenticatedRequest, @Body() dto: CreateTaxRuleDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.hrConfigService.createTaxRule(tenantId, dto, userId);
  }

  @Patch("tax-rules/:id")
  @RequirePermission("hr.manage")
  async updateTaxRule(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateTaxRuleDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.updateTaxRule(tenantId, id, dto);
  }

  @Delete("tax-rules/:id")
  @RequirePermission("hr.manage")
  async deleteTaxRule(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.deleteTaxRule(tenantId, id);
  }

  @Get("deduction-rules")
  @RequirePermission("hr.manage")
  async listDeductionRules(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.listDeductionRules(tenantId);
  }

  @Post("deduction-rules")
  @RequirePermission("hr.manage")
  async createDeductionRule(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateDeductionRuleDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.hrConfigService.createDeductionRule(tenantId, dto, userId);
  }

  @Patch("deduction-rules/:id")
  @RequirePermission("hr.manage")
  async updateDeductionRule(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateDeductionRuleDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.updateDeductionRule(tenantId, id, dto);
  }

  @Delete("deduction-rules/:id")
  @RequirePermission("hr.manage")
  async deleteDeductionRule(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.deleteDeductionRule(tenantId, id);
  }

  @Get("working-calendars")
  @RequirePermission("hr.manage")
  async listWorkingCalendars(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.listWorkingCalendars(tenantId);
  }

  @Post("working-calendars")
  @RequirePermission("hr.manage")
  async createWorkingCalendar(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateWorkingCalendarDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.hrConfigService.createWorkingCalendar(tenantId, dto, userId);
  }

  @Patch("working-calendars/:id")
  @RequirePermission("hr.manage")
  async updateWorkingCalendar(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateWorkingCalendarDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.updateWorkingCalendar(tenantId, id, dto);
  }

  @Delete("working-calendars/:id")
  @RequirePermission("hr.manage")
  async deleteWorkingCalendar(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.deleteWorkingCalendar(tenantId, id);
  }

  @Get("salary-components")
  @RequirePermission("hr.manage")
  async listSalaryComponents(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.listSalaryComponents(tenantId);
  }

  @Post("salary-components")
  @RequirePermission("hr.manage")
  async createSalaryComponent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSalaryComponentDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.hrConfigService.createSalaryComponent(tenantId, dto, userId);
  }

  @Patch("salary-components/:id")
  @RequirePermission("hr.manage")
  async updateSalaryComponent(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateSalaryComponentDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.updateSalaryComponent(tenantId, id, dto);
  }

  @Delete("salary-components/:id")
  @RequirePermission("hr.manage")
  async deleteSalaryComponent(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.hrConfigService.deleteSalaryComponent(tenantId, id);
  }
}
