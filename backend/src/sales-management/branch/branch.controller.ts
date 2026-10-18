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
import { BranchService } from "./branch.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";
import { BranchFiltersDto } from "./dto/branch-filters.dto";
import { BranchDropdownFiltersDto } from "./dto/branch-dropdown-filters.dto";

@ApiTags("Sales Management - Branches")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branches")
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Get()
  @RequirePermission("sales-branch.view")
  @ApiOperation({ summary: "List branches with pagination, search and city filter" })
  listBranches(@Query() branchFiltersDto: BranchFiltersDto) {
    return this.branchService.listBranches(branchFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("sales-branch.view")
  @ApiOperation({
    summary:
      "Dropdown list of active branches, optionally filtered by city and/or type (e.g. PRIMARY only, for a parent-branch picker)",
  })
  dropdown(@Query() branchDropdownFiltersDto: BranchDropdownFiltersDto) {
    return this.branchService.dropdown(branchDropdownFiltersDto);
  }

  @Get("distributor-options")
  @RequirePermission("sales-branch.view", "sales-branch.manage")
  @ApiOperation({
    summary: "ACTIVE employees eligible as branch distributor (includes employees without login)",
  })
  listDistributorOptions() {
    return this.branchService.listDistributorOptions();
  }

  @Get(":branchId")
  @RequirePermission("sales-branch.view")
  @ApiOperation({ summary: "Get branch by ID" })
  getBranch(@Param("branchId", ParseUUIDPipe) branchId: string) {
    return this.branchService.getBranch(branchId);
  }

  @Get(":branchId/tree")
  @RequirePermission("sales-branch.view")
  @ApiOperation({ summary: "Get a branch's full territory tree — areas nested" })
  getBranchTree(@Param("branchId", ParseUUIDPipe) branchId: string) {
    return this.branchService.getBranchTree(branchId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
  @Post()
  @RequirePermission("sales-branch.manage")
  @ApiOperation({ summary: "Create a new branch under a city" })
  createBranch(@Body() createBranchDto: CreateBranchDto) {
    return this.branchService.createBranch(createBranchDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
  @Patch(":branchId")
  @RequirePermission("sales-branch.manage")
  @ApiOperation({ summary: "Update a branch" })
  updateBranch(
    @Param("branchId", ParseUUIDPipe) branchId: string,
    @Body() updateBranchDto: UpdateBranchDto,
  ) {
    return this.branchService.updateBranch(branchId, updateBranchDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_BRANCHES })
  @Delete(":branchId")
  @RequirePermission("sales-branch.manage")
  @ApiOperation({ summary: "Delete branch — blocked if areas exist under it" })
  async deleteBranch(@Param("branchId", ParseUUIDPipe) branchId: string) {
    await this.branchService.deleteBranch(branchId);
    return { message: "Branch deleted successfully" };
  }
}
