import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { CreateProductBonusGroupDto } from "./dto/create-product-bonus-group.dto";
import { UpdateProductBonusGroupDto } from "./dto/update-product-bonus-group.dto";
import { ProductBonusGroupFiltersDto } from "./dto/product-bonus-group-filters.dto";
import { ProductBonusGroupService } from "./product-bonus-group.service";

@ApiTags("Sales Management - Product Bonus Groups")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/product-bonus-groups")
export class ProductBonusGroupController {
  constructor(private readonly productBonusGroupService: ProductBonusGroupService) {}

  @Get()
  @RequirePermission("product-bonus-group.view")
  @ApiOperation({ summary: "List product bonus groups with pagination and filters" })
  listProductBonusGroups(@Query() productBonusGroupFiltersDto: ProductBonusGroupFiltersDto) {
    return this.productBonusGroupService.listProductBonusGroups(productBonusGroupFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("product-bonus-group.view")
  @ApiOperation({ summary: "Dropdown list of active product bonus groups" })
  dropdown() {
    return this.productBonusGroupService.dropdown();
  }

  @Get(":productBonusGroupId")
  @RequirePermission("product-bonus-group.view")
  @ApiOperation({ summary: "Get product bonus group by ID" })
  getProductBonusGroup(
    @Param("productBonusGroupId", ParseUUIDPipe) productBonusGroupId: string,
  ) {
    return this.productBonusGroupService.getProductBonusGroup(productBonusGroupId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_GROUPS })
  @Post()
  @RequirePermission("product-bonus-group.manage")
  @ApiOperation({ summary: "Create a new product bonus group" })
  createProductBonusGroup(@Body() createProductBonusGroupDto: CreateProductBonusGroupDto) {
    return this.productBonusGroupService.createProductBonusGroup(createProductBonusGroupDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_GROUPS })
  @Patch(":productBonusGroupId")
  @RequirePermission("product-bonus-group.manage")
  @ApiOperation({ summary: "Update a product bonus group" })
  updateProductBonusGroup(
    @Param("productBonusGroupId", ParseUUIDPipe) productBonusGroupId: string,
    @Body() updateProductBonusGroupDto: UpdateProductBonusGroupDto,
  ) {
    return this.productBonusGroupService.updateProductBonusGroup(
      productBonusGroupId,
      updateProductBonusGroupDto,
    );
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_GROUPS })
  @Delete(":productBonusGroupId")
  @RequirePermission("product-bonus-group.manage")
  @ApiOperation({ summary: "Delete a product bonus group" })
  async deleteProductBonusGroup(
    @Param("productBonusGroupId", ParseUUIDPipe) productBonusGroupId: string,
  ) {
    await this.productBonusGroupService.deleteProductBonusGroup(productBonusGroupId);
    return { message: "Product bonus group deleted successfully" };
  }
}
