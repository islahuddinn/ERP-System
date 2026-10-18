import {
  Controller,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { RecruitmentService } from "../services/recruitment.service";

interface AuthenticatedRequest extends Request {
  user: { id: string; tenantId: string };
}

@ApiTags("HR Recruitment - Dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/recruitment")
export class RecruitmentDashboardController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Get("stats")
  @RequirePermission("hr.view_recruitment")
  async getStats(@Req() req: AuthenticatedRequest) {
    return this.recruitmentService.getRecruitmentStats(req.user.tenantId);
  }
}
