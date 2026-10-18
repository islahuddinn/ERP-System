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
import { ProductBrandService } from "./product-brand.service";
import { CreateProductBrandDto } from "./dto/create-product-brand.dto";
import { UpdateProductBrandDto } from "./dto/update-product-brand.dto";
import { ProductBrandFiltersDto } from "./dto/product-brand-filters.dto";

@ApiTags("Product Management - Brands")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("product-management/brands")
export class ProductBrandController {
  constructor(private readonly productBrandService: ProductBrandService) {}

  @Get()
  @RequirePermission("product-brand.view")
  @ApiOperation({ summary: "List product brands with pagination and search" })
  listProductBrands(@Query() productBrandFiltersDto: ProductBrandFiltersDto) {
    return this.productBrandService.listProductBrands(productBrandFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("product-brand.view")
  @ApiOperation({ summary: "Dropdown list of active product brands — id and name only" })
  dropdown() {
    return this.productBrandService.dropdown();
  }

  @Get(":productBrandId")
  @RequirePermission("product-brand.view")
  @ApiOperation({ summary: "Get product brand by ID" })
  getProductBrand(@Param("productBrandId", ParseUUIDPipe) productBrandId: string) {
    return this.productBrandService.getProductBrand(productBrandId);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
  @Post()
  @RequirePermission("product-brand.manage")
  @ApiOperation({ summary: "Create a new product brand" })
  createProductBrand(@Body() createProductBrandDto: CreateProductBrandDto) {
    return this.productBrandService.createProductBrand(createProductBrandDto);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
  @Patch(":productBrandId")
  @RequirePermission("product-brand.manage")
  @ApiOperation({ summary: "Update a product brand" })
  updateProductBrand(
    @Param("productBrandId", ParseUUIDPipe) productBrandId: string,
    @Body() updateProductBrandDto: UpdateProductBrandDto,
  ) {
    return this.productBrandService.updateProductBrand(productBrandId, updateProductBrandDto);
  }

  @Auditable({ module: AuditModule.PRODUCT_MANAGEMENT_BRANDS })
  @Delete(":productBrandId")
  @RequirePermission("product-brand.manage")
  @ApiOperation({ summary: "Delete a product brand" })
  async deleteProductBrand(@Param("productBrandId", ParseUUIDPipe) productBrandId: string) {
    await this.productBrandService.deleteProductBrand(productBrandId);
    return { message: "Product brand deleted successfully" };
  }
}
