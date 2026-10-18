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
import { ProductGroupService } from "./product-group.service";
import { CreateProductGroupDto } from "./dto/create-product-group.dto";
import { UpdateProductGroupDto } from "./dto/update-product-group.dto";
import { ProductGroupFiltersDto } from "./dto/product-group-filters.dto";

@ApiTags("Product Management - Product Groups")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("product-management/product-groups")
export class ProductGroupController {
  constructor(private readonly productGroupService: ProductGroupService) {}

  @Get()
  @RequirePermission("product-group.view")
  @ApiOperation({ summary: "List product groups with pagination and search" })
  listProductGroups(@Query() productGroupFiltersDto: ProductGroupFiltersDto) {
    return this.productGroupService.listProductGroups(productGroupFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("product-group.view")
  @ApiOperation({ summary: "Dropdown list of active product groups — id and name only" })
  dropdown() {
    return this.productGroupService.dropdown();
  }

  @Get(":productGroupId")
  @RequirePermission("product-group.view")
  @ApiOperation({ summary: "Get product group by ID" })
  getProductGroup(@Param("productGroupId", ParseUUIDPipe) productGroupId: string) {
    return this.productGroupService.getProductGroup(productGroupId);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
  @Post()
  @RequirePermission("product-group.manage")
  @ApiOperation({ summary: "Create a new product group" })
  createProductGroup(@Body() createProductGroupDto: CreateProductGroupDto) {
    return this.productGroupService.createProductGroup(createProductGroupDto);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
  @Patch(":productGroupId")
  @RequirePermission("product-group.manage")
  @ApiOperation({ summary: "Update a product group" })
  updateProductGroup(
    @Param("productGroupId", ParseUUIDPipe) productGroupId: string,
    @Body() updateProductGroupDto: UpdateProductGroupDto,
  ) {
    return this.productGroupService.updateProductGroup(productGroupId, updateProductGroupDto);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_PRODUCT_GROUPS })
  @Delete(":productGroupId")
  @RequirePermission("product-group.manage")
  @ApiOperation({ summary: "Delete a product group" })
  async deleteProductGroup(@Param("productGroupId", ParseUUIDPipe) productGroupId: string) {
    await this.productGroupService.deleteProductGroup(productGroupId);
    return { message: "Product group deleted successfully" };
  }
}
