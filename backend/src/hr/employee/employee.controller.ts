import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { EmployeeService } from "./employee.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { UpdateEmployeeDto } from "./dto/update-employee.dto";
import { EmployeeFiltersDto } from "./dto/employee-filters.dto";
import { AttachEmployeeDocumentDto } from "./dto/attach-employee-document.dto";

@ApiTags("HR - Employees")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/employees")
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Get()
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List employees with filters and pagination" })
  listEmployees(@Query() employeeFiltersDto: EmployeeFiltersDto) {
    return this.employeeService.listEmployees(employeeFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Dropdown list of ACTIVE employees — id, employeeCode, user name only" })
  dropdown() {
    return this.employeeService.dropdown();
  }

  @Get("dropdown/distributors")
  @RequirePermission("hr.view", "sales-branch.manage", "sales-branch.view")
  @ApiOperation({
    summary:
      "ACTIVE employees for branch distributor assignment — includes employees without system login",
  })
  distributorDropdown() {
    return this.employeeService.distributorDropdown();
  }

  @Get(":employeeId")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Get employee full profile by ID" })
  getEmployee(@Param("employeeId", ParseUUIDPipe) employeeId: string) {
    return this.employeeService.getEmployee(employeeId);
  }

  @Post()
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Hire a new person — creates User + Employee atomically" })
  createEmployee(@Req() req: RequestWithUser, @Body() createEmployeeDto: CreateEmployeeDto) {
    return this.employeeService.createEmployee(createEmployeeDto, req);
  }

  @Patch(":employeeId")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Update employee HR profile or personal info" })
  @Auditable({ module: AuditModule.HR_EMPLOYEES })
  updateEmployee(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeService.updateEmployee(employeeId, updateEmployeeDto, req);
  }

  @Post(":employeeId/documents")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Attach a document to an employee record" })
  attachDocument(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Body() attachEmployeeDocumentDto: AttachEmployeeDocumentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeService.attachDocument(employeeId, attachEmployeeDocumentDto, req.user.id);
  }
}
