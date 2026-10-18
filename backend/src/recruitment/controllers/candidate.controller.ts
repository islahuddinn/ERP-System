import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { RecruitmentService } from "../services/recruitment.service";
import {
  CreateCandidateDto,
  UpdateCandidateDto,
  ListCandidatesDto,
} from "../dto/candidate.dto";

interface AuthenticatedRequest extends Request {
  user: { id: string; tenantId: string };
}

@ApiTags("HR Recruitment - Candidates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/recruitment/candidates")
export class CandidateController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @RequirePermission("hr.manage_recruitment")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCandidateDto,
  ) {
    return this.recruitmentService.createCandidate(req.user, dto);
  }

  @Get()
  @RequirePermission("hr.view_recruitment")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListCandidatesDto,
  ) {
    return this.recruitmentService.listCandidates(req.user.tenantId, query);
  }

  @Get(":id")
  @RequirePermission("hr.view_recruitment")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.getCandidate(req.user.tenantId, id);
  }

  @Put(":id")
  @RequirePermission("hr.manage_recruitment")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.recruitmentService.updateCandidate(req.user, id, dto);
  }

  @Delete(":id")
  @RequirePermission("hr.manage_recruitment")
  @ApiOperation({ summary: "Delete a candidate" })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.recruitmentService.deleteCandidate(req.user, id);
  }
}
