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
import { AuditAction, AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { LeaveRequestService } from "./leave-request.service";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { DecideLeaveApprovalDto } from "./dto/decide-leave-approval.dto";
import { LeaveRequestFiltersDto } from "./dto/leave-request-filters.dto";

@ApiTags("HR - Leave Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/leave-requests")
export class LeaveRequestController {
  constructor(private readonly leaveRequestService: LeaveRequestService) {}

  @Get()
  @RequirePermission("leave-requests.view")
  @ApiOperation({ summary: "List all leave requests with pagination and optional filters" })
  listLeaveRequests(@Query() leaveRequestFiltersDto: LeaveRequestFiltersDto) {
    return this.leaveRequestService.listLeaveRequests(leaveRequestFiltersDto);
  }

  @Get(":leaveRequestId")
  @RequirePermission("leave-requests.view")
  @ApiOperation({ summary: "Get a single leave request by ID" })
  getLeaveRequest(@Param("leaveRequestId", ParseUUIDPipe) leaveRequestId: string) {
    return this.leaveRequestService.getLeaveRequest(leaveRequestId);
  }

  @Post()
  @RequirePermission("leave-requests.manage")
  @ApiOperation({
    summary:
      "Create a leave request for an employee — requires at least one approver; paid leave is validated against the employee's active contract balance",
  })
  @Auditable({ module: AuditModule.HR_LEAVE_REQUESTS })
  createLeaveRequest(
    @Body() createLeaveRequestDto: CreateLeaveRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.leaveRequestService.create(createLeaveRequestDto, req.user.id);
  }

  @Delete(":leaveRequestId")
  @RequirePermission("leave-requests.manage")
  @ApiOperation({
    summary:
      "Delete a leave request — only allowed while it is pending and no approver has decided yet",
  })
  @Auditable({ module: AuditModule.HR_LEAVE_REQUESTS, action: AuditAction.DELETE })
  async deleteLeaveRequest(@Param("leaveRequestId", ParseUUIDPipe) leaveRequestId: string) {
    await this.leaveRequestService.delete(leaveRequestId);
    return { message: "Leave request deleted successfully" };
  }

  @Post(":leaveRequestId/approve")
  @RequirePermission("leave-requests.approve")
  @ApiOperation({
    summary:
      "Record the logged-in user's approval/rejection decision for a leave request; once every assigned approver approves, the request is confirmed and paid leave is deducted from the employee's active contract",
  })
  @Auditable({ module: AuditModule.HR_LEAVE_REQUESTS, action: AuditAction.APPROVE })
  decideApproval(
    @Param("leaveRequestId", ParseUUIDPipe) leaveRequestId: string,
    @Body() decideLeaveApprovalDto: DecideLeaveApprovalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.leaveRequestService.decideApproval(
      leaveRequestId,
      decideLeaveApprovalDto,
      req.user.id,
    );
  }
}
