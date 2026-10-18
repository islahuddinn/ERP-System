import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuditAction, AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "src/users/guards/permissions.guard";
import { Auditable } from "src/audit/decorators/auditable.decorator";
import { RequirePermission } from "src/users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { PayrollService } from "./payroll.service";
import { CreatePayrollDto } from "./dto/create-payroll.dto";
import { PayrollQueryDto } from "./dto/payroll-query.dto";
import { AddBonusDto } from "./dto/add-bonus.dto";

@ApiTags("HR - Payroll")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/payroll")
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Get()
  @ApiOperation({
    summary:
      "Get payroll records with pagination and filters — callers with only payroll.view-own are restricted to their own records",
  })
  @RequirePermission("payroll.view", "payroll.view-own")
  async findAll(@Query() payrollQueryDto: PayrollQueryDto, @Req() req: RequestWithUser) {
    return this.payrollService.findAll(payrollQueryDto, req.user.id);
  }

  @Get("preview")
  @ApiOperation({ summary: "Preview payroll calculation without creating it" })
  @RequirePermission("payroll.view")
  async preview(@Query() createPayrollDto: CreatePayrollDto) {
    return this.payrollService.preview(createPayrollDto);
  }

  @Get(":payrollId")
  @ApiOperation({
    summary:
      "Get payroll record by ID — callers with only payroll.view-own can only fetch their own record",
  })
  @RequirePermission("payroll.view", "payroll.view-own")
  async findOne(@Param("payrollId", ParseUUIDPipe) payrollId: string, @Req() req: RequestWithUser) {
    return this.payrollService.findOne(payrollId, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: "Create payroll record(s) for one or multiple employees",
  })
  @RequirePermission("payroll.create")
  async create(@Body() createPayrollDto: CreatePayrollDto, @Req() req: RequestWithUser) {
    return this.payrollService.create(createPayrollDto, req.user.id);
  }

  @Patch(":payrollId/bonus")
  @ApiOperation({ summary: "Add or update the bonus amount on a DRAFT payroll record" })
  @RequirePermission("payroll.create")
  @Auditable({ module: AuditModule.HR_PAYROLL, action: AuditAction.UPDATE })
  async addBonus(
    @Param("payrollId", ParseUUIDPipe) payrollId: string,
    @Body() addBonusDto: AddBonusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.payrollService.addBonus(payrollId, addBonusDto, req.user.id);
  }

  @Post(":payrollId/approve")
  @ApiOperation({ summary: "Approve a DRAFT payroll record" })
  @RequirePermission("payroll.approve")
  @Auditable({ module: AuditModule.HR_PAYROLL, action: AuditAction.UPDATE })
  async approve(@Param("payrollId", ParseUUIDPipe) payrollId: string, @Req() req: RequestWithUser) {
    return this.payrollService.approve(payrollId, req.user.id);
  }

  @Post(":payrollId/pay")
  @ApiOperation({ summary: "Mark an APPROVED payroll as PAID" })
  @RequirePermission("payroll.approve")
  @Auditable({ module: AuditModule.HR_PAYROLL, action: AuditAction.UPDATE })
  async pay(@Param("payrollId", ParseUUIDPipe) payrollId: string) {
    return this.payrollService.pay(payrollId);
  }
}
