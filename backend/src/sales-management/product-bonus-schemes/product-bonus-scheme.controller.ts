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
import { CreateProductBonusSchemeDto } from "./dto/create-product-bonus-scheme.dto";
import { UpdateProductBonusSchemeDto } from "./dto/update-product-bonus-scheme.dto";
import { ProductBonusSchemeFiltersDto } from "./dto/product-bonus-scheme-filters.dto";
import { ProductBonusSchemeService } from "./product-bonus-scheme.service";

@ApiTags("Sales Management - Product Bonus Schemes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/product-bonus-schemes")
export class ProductBonusSchemeController {
  constructor(private readonly productBonusSchemeService: ProductBonusSchemeService) {}

  @Get()
  @RequirePermission("product-bonus-scheme.view")
  @ApiOperation({ summary: "List product bonus schemes with pagination and filters" })
  listProductBonusSchemes(@Query() productBonusSchemeFiltersDto: ProductBonusSchemeFiltersDto) {
    return this.productBonusSchemeService.listProductBonusSchemes(productBonusSchemeFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("product-bonus-scheme.view")
  @ApiOperation({ summary: "Dropdown list of active product bonus schemes" })
  dropdown() {
    return this.productBonusSchemeService.dropdown();
  }

  @Get(":productBonusSchemeId")
  @RequirePermission("product-bonus-scheme.view")
  @ApiOperation({ summary: "Get product bonus scheme by ID" })
  getProductBonusScheme(
    @Param("productBonusSchemeId", ParseUUIDPipe) productBonusSchemeId: string,
  ) {
    return this.productBonusSchemeService.getProductBonusScheme(productBonusSchemeId);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_SCHEMES })
  @Post()
  @RequirePermission("product-bonus-scheme.manage")
  @ApiOperation({ summary: "Create a new product bonus scheme" })
  createProductBonusScheme(@Body() createProductBonusSchemeDto: CreateProductBonusSchemeDto) {
    return this.productBonusSchemeService.createProductBonusScheme(createProductBonusSchemeDto);
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_SCHEMES })
  @Patch(":productBonusSchemeId")
  @RequirePermission("product-bonus-scheme.manage")
  @ApiOperation({ summary: "Update a product bonus scheme" })
  updateProductBonusScheme(
    @Param("productBonusSchemeId", ParseUUIDPipe) productBonusSchemeId: string,
    @Body() updateProductBonusSchemeDto: UpdateProductBonusSchemeDto,
  ) {
    return this.productBonusSchemeService.updateProductBonusScheme(
      productBonusSchemeId,
      updateProductBonusSchemeDto,
    );
  }

  @Auditable({ module: AuditModule.SALES_MANAGEMENT_PRODUCT_BONUS_SCHEMES })
  @Delete(":productBonusSchemeId")
  @RequirePermission("product-bonus-scheme.manage")
  @ApiOperation({ summary: "Delete a product bonus scheme" })
  async deleteProductBonusScheme(
    @Param("productBonusSchemeId", ParseUUIDPipe) productBonusSchemeId: string,
  ) {
    await this.productBonusSchemeService.deleteProductBonusScheme(productBonusSchemeId);
    return { message: "Product bonus scheme deleted successfully" };
  }
}
