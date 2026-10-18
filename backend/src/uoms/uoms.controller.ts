import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { UOMsService } from "./uoms.service";
import { UomQueryDto } from "./dto/uom-query.dto";
import { CreateUOMDto } from "./dto/create-uom.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("UOMs")
@Controller("uoms")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UOMsController {
  constructor(private readonly uomService: UOMsService) {}

  @Get("dropdown")
  @RequirePermission("uoms.read")
  dropdown(@Query() query: UomQueryDto) {
    return this.uomService.dropdown(query);
  }

  @Get()
  @RequirePermission("uoms.read")
  findAll(@Query() query: UomQueryDto) {
    if (query.category) {
      return this.uomService.findByCategory(query);
    }
    return this.uomService.findAll();
  }

  @Auditable({ module: AuditModule.UOM })
  @Post()
  @RequirePermission("uoms.create")
  @ApiOperation({ summary: "Create a new unit of measure" })
  create(@Body() createUOMDto: CreateUOMDto, @Req() req: any) {
    return this.uomService.create(createUOMDto, req.user?.id);
  }

  @Auditable({ module: AuditModule.UOM })
  @Delete(":uomId")
  @RequirePermission("uoms.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a unit of measure (only if not in use)" })
  remove(@Param("uomId") uomId: string) {
    return this.uomService.remove(uomId);
  }
}
