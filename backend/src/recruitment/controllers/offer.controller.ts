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
  CreateOfferDto,
  UpdateOfferDto,
  ListOffersDto,
} from "../dto/offer.dto";

interface AuthenticatedRequest extends Request {
  user: { id: string; tenantId: string };
}

@ApiTags("HR Recruitment - Offers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/recruitment/offers")
export class OfferController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post()
  @RequirePermission("hr.manage_recruitment")
  async create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOfferDto,
  ) {
    return this.recruitmentService.createOffer(req.user, dto);
  }

  @Get()
  @RequirePermission("hr.view_recruitment")
  async list(
    @Req() req: AuthenticatedRequest,
    @Query() query: ListOffersDto,
  ) {
    return this.recruitmentService.listOffers(req.user.tenantId, query);
  }

  @Get(":id")
  @RequirePermission("hr.view_recruitment")
  async get(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.getOffer(req.user.tenantId, id);
  }

  @Put(":id")
  @RequirePermission("hr.manage_recruitment")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Body() dto: UpdateOfferDto,
  ) {
    return this.recruitmentService.updateOffer(req.user, id, dto);
  }

  @Delete(":id")
  @RequirePermission("hr.manage_recruitment")
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return this.recruitmentService.deleteOffer(req.user, id);
  }
}
