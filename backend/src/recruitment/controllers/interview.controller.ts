import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { RecruitmentService } from "../services/recruitment.service";
import {
  CreateInterviewDto,
  UpdateInterviewDto,
  ListInterviewsDto,
} from "../dto/interview.dto";

interface AuthenticatedRequest extends Request {
  user: { id: string; tenantId: string };
}

@ApiTags("HR Recruitment - Interviews")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/recruitment/interviews")
export class InterviewController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @RequirePermission("hr.manage_recruitment")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.recruitmentService.createInterview(req.user, dto);
  }

  @Get()
  @RequirePermission("hr.view_recruitment")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListInterviewsDto,
  ) {
    return this.recruitmentService.listInterviews(req.user.tenantId, query);
  }

  @Get(":id")
  @RequirePermission("hr.view_recruitment")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.getInterview(req.user.tenantId, id);
  }

  @Put(":id")
  @RequirePermission("hr.manage_recruitment")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.recruitmentService.updateInterview(req.user, id, dto);
  }

  @Delete(":id")
  @RequirePermission("hr.manage_recruitment")
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.deleteInterview(req.user, id);
  }
}
