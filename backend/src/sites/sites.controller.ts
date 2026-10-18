import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { SitesService } from "./sites.service";
import { CreateSiteDto } from "./dto/create-site.dto";
import { UpdateSiteDto } from "./dto/update-site.dto";
import { SitesQueryDto } from "./dto/sites-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Sites")
@Controller("sites")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Auditable({ module: AuditModule.SITES })
  @Post()
  @RequirePermission("sites.create")
  @ApiOperation({ summary: "Create a new site" })
  create(@Body() createDto: CreateSiteDto, @Req() req: RequestWithUser) {
    return this.sitesService.create(createDto, req);
  }

  // Static routes must be declared before parameterised (:siteId) routes

  @Get("dropdown")
  @RequirePermission("sites.read")
  @ApiOperation({ summary: "Lightweight list for select dropdowns" })
  dropdown() {
    return this.sitesService.dropdown();
  }

  @Get("tree")
  @RequirePermission("sites.read")
  @ApiOperation({ summary: "Full nested hierarchy tree of all active sites" })
  tree() {
    return this.sitesService.tree();
  }

  @Get()
  @RequirePermission("sites.read")
  @ApiOperation({ summary: "Paginated flat list with optional type / status filters" })
  findAll(@Query() query: SitesQueryDto) {
    return this.sitesService.findAll(query);
  }

  @Get(":siteId")
  @RequirePermission("sites.read")
  @ApiOperation({ summary: "Get a single site with its parent info" })
  findOne(@Param("siteId") siteId: string) {
    return this.sitesService.findOne(siteId);
  }

  @Get(":siteId/children")
  @RequirePermission("sites.read")
  @ApiOperation({ summary: "Get direct children of a site" })
  findChildren(@Param("siteId") siteId: string) {
    return this.sitesService.findChildren(siteId);
  }

  @Get(":siteId/ancestors")
  @RequirePermission("sites.read")
  @ApiOperation({
    summary: "Get full ancestor chain from root down to the site's immediate parent",
  })
  findAncestors(@Param("siteId") siteId: string) {
    return this.sitesService.findAncestors(siteId);
  }

  // @Auditable({ module: AuditModule.SITES })
  // @Patch(":siteId/status")
  // @RequirePermission("sites.update")
  // @ApiOperation({
  //   summary:
  //     "Change a site's operational status (ACTIVE, INACTIVE, QUARANTINE, UNDER_MAINTENANCE, FULL)",
  // })
  // updateStatus(
  //   @Param("siteId") siteId: string,
  //   @Body(
  //     "status",
  //     new ParseEnumPipe(SiteStatus, {
  //       exceptionFactory: () =>
  //         new BadRequestException(`status must be one of: ${Object.values(SiteStatus).join(", ")}`),
  //     }),
  //   )
  //   status: SiteStatus,
  // ) {
  //   return this.sitesService.updateStatus(siteId, status);
  // }

  @Auditable({ module: AuditModule.SITES })
  @Patch(":siteId")
  @RequirePermission("sites.update")
  @ApiOperation({ summary: "Update site fields" })
  update(@Param("siteId") siteId: string, @Body() updateDto: UpdateSiteDto) {
    return this.sitesService.update(siteId, updateDto);
  }

  @Auditable({ module: AuditModule.SITES })
  @Delete(":siteId")
  @RequirePermission("sites.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Deactivate a site (sets status to INACTIVE)" })
  remove(@Param("siteId") siteId: string) {
    return this.sitesService.remove(siteId);
  }
}
