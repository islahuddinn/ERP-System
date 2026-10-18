import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { DepartmentService } from "./department.service";
import { CreateDepartmentDto } from "./dto/create-department.dto";
import { UpdateDepartmentDto } from "./dto/update-department.dto";
import { DepartmentFiltersDto } from "./dto/department-filters.dto";

@ApiTags("HR - Departments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/departments")
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List departments with pagination and search" })
  listDepartments(@Query() departmentFiltersDto: DepartmentFiltersDto) {
    return this.departmentService.listDepartments(departmentFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Dropdown list of departments — id, name, parentDepartmentId only" })
  dropdown() {
    return this.departmentService.dropdown();
  }

  @Get("tree")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Get full department hierarchy as a nested tree" })
  getDepartmentTree() {
    return this.departmentService.getDepartmentTree();
  }

  @Get(":departmentId")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "Get department by ID with parent and sub-departments" })
  getDepartment(@Param("departmentId", ParseUUIDPipe) departmentId: string) {
    return this.departmentService.getDepartment(departmentId);
  }

  @Auditable({ module: AuditModule.HR_DEPARTMENTS })
  @Post()
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Create a new department" })
  createDepartment(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentService.createDepartment(createDepartmentDto);
  }

  @Auditable({ module: AuditModule.HR_DEPARTMENTS })
  @Patch(":departmentId")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Update department name, description, or parent" })
  updateDepartment(
    @Param("departmentId", ParseUUIDPipe) departmentId: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentService.updateDepartment(departmentId, updateDepartmentDto);
  }

  @Auditable({ module: AuditModule.HR_DEPARTMENTS })
  @Delete(":departmentId")
  @RequirePermission("hr.manage_employees")
  @ApiOperation({ summary: "Delete department — blocked if employees or sub-departments exist" })
  async deleteDepartment(@Param("departmentId", ParseUUIDPipe) departmentId: string) {
    await this.departmentService.deleteDepartment(departmentId);
    return { message: "Department deleted successfully" };
  }
}
