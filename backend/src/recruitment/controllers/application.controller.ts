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
  CreateApplicationDto,
  UpdateApplicationDto,
  UpdateApplicationStageDto,
  ListApplicationsDto,
} from "../dto/application.dto";
import { ApplicationStage } from "../dto/recruitment.enums";

interface AuthenticatedRequest extends Request {
  user: { id: string; tenantId: string };
}

@ApiTags("HR Recruitment - Applications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/recruitment/applications")
export class ApplicationController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @RequirePermission("hr.manage_recruitment")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateApplicationDto,
  ) {
    return this.recruitmentService.createApplication(req.user, dto);
  }

  @Get()
  @RequirePermission("hr.view_recruitment")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListApplicationsDto,
  ) {
    return this.recruitmentService.listApplications(req.user.tenantId, query);
  }

  @Get(":id")
  @RequirePermission("hr.view_recruitment")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.getApplication(req.user.tenantId, id);
  }

  @Put(":id")
  @RequirePermission("hr.manage_recruitment")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationDto,
  ) {
    return this.recruitmentService.updateApplication(req.user, id, dto);
  }

  @Put(":id/stage")
  @RequirePermission("hr.manage_recruitment")
  async updateStage(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateApplicationStageDto,
  ) {
    return this.recruitmentService.updateApplicationStage(
      req.user,
      id,
      dto.stage as ApplicationStage,
      dto.notes,
    );
  }

  @Delete(":id")
  @RequirePermission("hr.manage_recruitment")
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.deleteApplication(req.user, id);
  }
}
