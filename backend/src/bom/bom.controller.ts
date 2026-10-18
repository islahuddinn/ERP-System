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
import { AuditModule, AuditAction } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../common/interfaces";
import { BomService } from "./bom.service";
import { CreateBomDto } from "./dto/create-bom.dto";
import { UpdateBomDto, UpdateBomStatusDto } from "./dto/update-bom.dto";
import { BomQueryDto } from "./dto/bom-query.dto";

@ApiTags("Bill of Materials")
@Controller("bom")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @Auditable({ module: AuditModule.BOM })
  @Post()
  @RequirePermission("bom.create")
  @ApiOperation({ summary: "Create a new BOM (starts in DRAFT status)" })
  create(@Body() dto: CreateBomDto, @Req() req: RequestWithUser) {
    return this.bomService.create(dto, req);
  }

  @Get()
  @RequirePermission("bom.read")
  @ApiOperation({ summary: "Get all BOMs with pagination and filters (productId, status)" })
  findAll(@Query() dto: BomQueryDto) {
    return this.bomService.findAll(dto);
  }

  // Must be declared before /:bomId to avoid route collision
  @Get("product/:productId/active")
  @RequirePermission("bom.read")
  @ApiOperation({ summary: "Get the currently ACTIVE BOM for a given product" })
  findActiveByProduct(@Param("productId") productId: string) {
    return this.bomService.findActiveByProduct(productId);
  }

  @Get(":bomId")
  @RequirePermission("bom.read")
  @ApiOperation({ summary: "Get a single BOM by ID with all its items" })
  findOne(@Param("bomId") bomId: string) {
    return this.bomService.findOne(bomId);
  }

  @Auditable({ module: AuditModule.BOM })
  @Patch(":bomId")
  @RequirePermission("bom.update")
  @ApiOperation({
    summary:
      "Update a DRAFT BOM (name, description, items). Items list fully replaces existing items.",
  })
  update(@Param("bomId") bomId: string, @Body() dto: UpdateBomDto, @Req() req: RequestWithUser) {
    return this.bomService.update(bomId, dto, req);
  }

  @Auditable({ module: AuditModule.BOM, action: AuditAction.UPDATE })
  @Patch(":bomId/status")
  @RequirePermission("bom.update")
  @ApiOperation({
    summary:
      "Update BOM status. Allowed transitions: DRAFT → ACTIVE, ACTIVE → INACTIVE, INACTIVE → ACTIVE",
  })
  updateStatus(
    @Param("bomId") bomId: string,
    @Body() dto: UpdateBomStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.bomService.updateStatus(bomId, dto, req);
  }

  @Auditable({ module: AuditModule.BOM })
  @Delete(":bomId")
  @RequirePermission("bom.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Soft-delete a DRAFT or INACTIVE BOM. ACTIVE BOMs must be deactivated first.",
  })
  remove(@Param("bomId") bomId: string) {
    return this.bomService.remove(bomId);
  }
}
