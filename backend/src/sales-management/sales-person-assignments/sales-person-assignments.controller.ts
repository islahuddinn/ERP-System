import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
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
import { SalesPersonAssignmentsService } from "./sales-person-assignments.service";
import { AssignSalesPersonDto } from "./dto/assign-sales-person.dto";
import { SalesPersonAssignmentFiltersDto } from "./dto/sales-person-assignment-filters.dto";

@ApiTags("Sales Management - Sales Person Assignments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/sales-person-assignments")
export class SalesPersonAssignmentsController {
  constructor(private readonly salesPersonAssignmentsService: SalesPersonAssignmentsService) {}

  @Get()
  @RequirePermission(
    "sales-person-assignment.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({ summary: "List Sales Person assignments, filterable by branch" })
  listSalesPersonAssignments(
    @Query() salesPersonAssignmentFiltersDto: SalesPersonAssignmentFiltersDto,
  ) {
    return this.salesPersonAssignmentsService.listSalesPersonAssignments(
      salesPersonAssignmentFiltersDto,
    );
  }

  @Auditable({ module: AuditModule.SALES_PERSON_ASSIGNMENTS })
  @Post()
  @RequirePermission("sales-person-assignment.manage", "branch-stock-operations.manage")
  @ApiOperation({ summary: "Assign an employee as a Sales Person under my branch" })
  assignSalesPerson(
    @Body() assignSalesPersonDto: AssignSalesPersonDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesPersonAssignmentsService.assignSalesPerson(assignSalesPersonDto, req);
  }

  @Auditable({ module: AuditModule.SALES_PERSON_ASSIGNMENTS })
  @Delete(":employeeId")
  @RequirePermission("sales-person-assignment.manage", "branch-stock-operations.manage")
  @ApiOperation({ summary: "Unassign a Sales Person from my branch" })
  async unassignSalesPerson(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.salesPersonAssignmentsService.unassignSalesPerson(employeeId, req);
    return { message: "Sales Person unassigned successfully" };
  }
}
