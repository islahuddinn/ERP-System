import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreateFixedAssetDto } from "../dto/create-fixed-asset.dto";
import { RunDepreciationDto } from "../dto/run-depreciation.dto";
import { FixedAssetService } from "../services/fixed-asset.service";
import { DepreciationService } from "../services/depreciation.service";

@ApiTags("Fixed Assets")
@Controller(["financial/assets", "assets"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class FixedAssetController {
  constructor(
    private readonly fixedAssetService: FixedAssetService,
    private readonly depreciationService: DepreciationService,
  ) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Purchase a fixed asset" })
  @ApiResponse({ status: 201, description: "Asset created successfully" })
  create(@Body() dto: CreateFixedAssetDto) {
    return this.fixedAssetService.purchaseAsset(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List fixed assets" })
  findAll() {
    return this.fixedAssetService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get fixed asset by ID" })
  findOne(@Param("id") id: string) {
    return this.fixedAssetService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update fixed asset" })
  update(
    @Param("id") id: string,
    @Body()
    dto: Partial<{
      assetName: string;
      usefulLife: number;
      depreciationMethod: string;
    }>,
  ) {
    return this.fixedAssetService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete fixed asset (soft delete)" })
  remove(@Param("id") id: string) {
    return this.fixedAssetService.remove(id);
  }

  @Post("depreciation/run")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Run depreciation for all fixed assets" })
  @ApiResponse({ status: 200, description: "Depreciation run completed" })
  runDepreciation(@Body() dto: RunDepreciationDto) {
    return this.depreciationService.runMonthlyDepreciation(dto);
  }
}
