import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { RawMaterialsService } from "./raw-materials.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { UpdateRawMaterialDto } from "./dto/update-raw-material.dto";
import { RawMaterialQueryDto } from "./dto/raw-material-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Raw Materials")
@Controller("raw-materials")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class RawMaterialsController {
  constructor(private readonly rawMaterialsService: RawMaterialsService) {}

  @Auditable({ module: AuditModule.RAW_MATERIALS })
  @Post()
  @RequirePermission("raw-materials.create")
  @ApiOperation({ summary: "Create a new raw material" })
  create(@Body() createDto: CreateRawMaterialDto, @Req() req: RequestWithUser) {
    return this.rawMaterialsService.create(createDto, req);
  }

  @Get("dropdown")
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get raw materials list for dropdowns" })
  dropdown() {
    return this.rawMaterialsService.dropdown();
  }

  @Get()
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get all raw materials with pagination and search" })
  findAll(@Query() rawMaterialQueryDto: RawMaterialQueryDto) {
    return this.rawMaterialsService.findAll(rawMaterialQueryDto);
  }

  @Get(":rawMaterialId")
  @RequirePermission("raw-materials.read")
  @ApiOperation({ summary: "Get a raw material by ID" })
  findOne(@Param("rawMaterialId") rawMaterialId: string) {
    return this.rawMaterialsService.findOne(rawMaterialId);
  }

  @Auditable({ module: AuditModule.RAW_MATERIALS })
  @Patch(":rawMaterialId")
  @RequirePermission("raw-materials.update")
  @ApiOperation({ summary: "Update a raw material" })
  update(
    @Param("rawMaterialId") rawMaterialId: string,
    @Body() updateDto: UpdateRawMaterialDto,
    @Req() req: RequestWithUser,
  ) {
    return this.rawMaterialsService.update(rawMaterialId, updateDto, req);
  }

  @Auditable({ module: AuditModule.RAW_MATERIALS })
  @Delete(":rawMaterialId")
  @RequirePermission("raw-materials.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a raw material (only if it has no linked records)" })
  remove(@Param("rawMaterialId") rawMaterialId: string) {
    return this.rawMaterialsService.remove(rawMaterialId);
  }
}
