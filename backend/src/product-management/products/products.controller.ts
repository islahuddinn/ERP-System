import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseUUIDPipe,
  Delete,
  UseGuards,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { ProductsService } from "./products.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductsQueryDto } from "./dto/products-query.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Products")
@Controller("product-management/products")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Auditable({ module: AuditModule.PRODUCTS })
  @Post()
  @RequirePermission("products.create")
  @ApiOperation({ summary: "Create a new product" })
  create(@Body() createProductDto: CreateProductDto, @Req() req: RequestWithUser) {
    return this.productsService.create(createProductDto, req);
  }

  @Get("dropdown")
  @RequirePermission("products.read")
  @ApiOperation({ summary: "Dropdown list of active products — id and name only" })
  dropdown() {
    return this.productsService.dropdown();
  }

  @Get()
  @RequirePermission("products.read")
  @ApiOperation({ summary: "List all products with pagination and filters" })
  findAll(@Query() productsQueryDto: ProductsQueryDto) {
    return this.productsService.findAll(productsQueryDto);
  }

  @Get(":productId")
  @RequirePermission("products.read")
  @ApiOperation({ summary: "Get product by ID" })
  findOne(@Param("productId", ParseUUIDPipe) productId: string) {
    return this.productsService.findOne(productId);
  }

  @Auditable({ module: AuditModule.PRODUCTS })
  @Patch(":productId")
  @RequirePermission("products.update")
  @ApiOperation({ summary: "Update a product" })
  update(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productsService.update(productId, updateProductDto, req);
  }

  @Auditable({ module: AuditModule.PRODUCTS })
  @Delete(":productId")
  @RequirePermission("products.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a product" })
  remove(@Param("productId", ParseUUIDPipe) productId: string, @Req() req: RequestWithUser) {
    return this.productsService.remove(productId, req);
  }

  @Auditable({ module: AuditModule.PRODUCTS })
  @Patch(":productId/toggle-active")
  @RequirePermission("products.update")
  @ApiOperation({ summary: "Toggle a product's active status" })
  toggleActive(@Param("productId", ParseUUIDPipe) productId: string, @Req() req: RequestWithUser) {
    return this.productsService.toggleActive(productId, req);
  }
}
