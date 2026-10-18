import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { GradeService } from "../services/grade.service";
import { CreateGradeDto } from "../dto/create-grade.dto";
import { UpdateGradeDto } from "../dto/update-grade.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    tenantId: string;
  };
}

@ApiTags("HR Core - Grades")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/core/grades")
export class GradeController {
  constructor(private readonly gradeService: GradeService) {}

  @Get()
  @RequirePermission("hr.view")
  async listGrades(@Req() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.gradeService.listGrades(tenantId);
  }

  @Get(":id")
  @RequirePermission("hr.view")
  async getGrade(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    return this.gradeService.getGrade(tenantId, id);
  }

  @Post()
  @RequirePermission("hr.manage_employees")
  async createGrade(@Req() req: AuthenticatedRequest, @Body() dto: CreateGradeDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.gradeService.createGrade(tenantId, dto, userId);
  }

  @Patch(":id")
  @RequirePermission("hr.manage_employees")
  async updateGrade(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.gradeService.updateGrade(tenantId, id, dto, userId);
  }

  @Delete(":id")
  @RequirePermission("hr.manage_employees")
  async deleteGrade(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    await this.gradeService.deleteGrade(tenantId, id);
    return { success: true };
  }
}

