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
import { ProductCategoryService } from "./product-category.service";
import { CreateProductCategoryDto } from "./dto/create-product-category.dto";
import { UpdateProductCategoryDto } from "./dto/update-product-category.dto";
import { ProductCategoryFiltersDto } from "./dto/product-category-filters.dto";

@ApiTags("Product Management - Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("product-management/categories")
export class ProductCategoryController {
  constructor(private readonly productCategoryService: ProductCategoryService) {}

  @Get()
  @RequirePermission("product-category.view")
  @ApiOperation({ summary: "List product categories with pagination and search" })
  listProductCategories(@Query() productCategoryFiltersDto: ProductCategoryFiltersDto) {
    return this.productCategoryService.listProductCategories(productCategoryFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("product-category.view")
  @ApiOperation({ summary: "Dropdown list of active product categories — id and name only" })
  dropdown() {
    return this.productCategoryService.dropdown();
  }

  @Get(":productCategoryId")
  @RequirePermission("product-category.view")
  @ApiOperation({ summary: "Get product category by ID" })
  getProductCategory(@Param("productCategoryId", ParseUUIDPipe) productCategoryId: string) {
    return this.productCategoryService.getProductCategory(productCategoryId);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
  @Post()
  @RequirePermission("product-category.manage")
  @ApiOperation({ summary: "Create a new product category" })
  createProductCategory(@Body() createProductCategoryDto: CreateProductCategoryDto) {
    return this.productCategoryService.createProductCategory(createProductCategoryDto);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
  @Patch(":productCategoryId")
  @RequirePermission("product-category.manage")
  @ApiOperation({ summary: "Update a product category" })
  updateProductCategory(
    @Param("productCategoryId", ParseUUIDPipe) productCategoryId: string,
    @Body() updateProductCategoryDto: UpdateProductCategoryDto,
  ) {
    return this.productCategoryService.updateProductCategory(
      productCategoryId,
      updateProductCategoryDto,
    );
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_CATEGORIES })
  @Delete(":productCategoryId")
  @RequirePermission("product-category.manage")
  @ApiOperation({ summary: "Delete a product category" })
  async deleteProductCategory(@Param("productCategoryId", ParseUUIDPipe) productCategoryId: string) {
    await this.productCategoryService.deleteProductCategory(productCategoryId);
    return { message: "Product category deleted successfully" };
  }
}
