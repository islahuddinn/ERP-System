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
import { CustomerCategoryService } from "./customer-category.service";
import { CreateCustomerCategoryDto } from "./dto/create-customer-category.dto";
import { UpdateCustomerCategoryDto } from "./dto/update-customer-category.dto";
import { CustomerCategoryFiltersDto } from "./dto/customer-category-filters.dto";

@ApiTags("Customers - Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-categories")
export class CustomerCategoryController {
  constructor(private readonly customerCategoryService: CustomerCategoryService) {}

  @Get()
  @RequirePermission("customer-category.view")
  @ApiOperation({ summary: "List customer categories with pagination and search" })
  listCustomerCategories(@Query() customerCategoryFiltersDto: CustomerCategoryFiltersDto) {
    return this.customerCategoryService.listCustomerCategories(customerCategoryFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("customer-category.view")
  @ApiOperation({ summary: "Dropdown list of active customer categories — id and name only" })
  dropdown() {
    return this.customerCategoryService.dropdown();
  }

  @Get(":customerCategoryId")
  @RequirePermission("customer-category.view")
  @ApiOperation({ summary: "Get customer category by ID" })
  getCustomerCategory(@Param("customerCategoryId", ParseUUIDPipe) customerCategoryId: string) {
    return this.customerCategoryService.getCustomerCategory(customerCategoryId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_CATEGORIES })
  @Post()
  @RequirePermission("customer-category.manage")
  @ApiOperation({ summary: "Create a new customer category" })
  createCustomerCategory(@Body() createCustomerCategoryDto: CreateCustomerCategoryDto) {
    return this.customerCategoryService.createCustomerCategory(createCustomerCategoryDto);
  }

  @Auditable({ module: AuditModule.CUSTOMER_CATEGORIES })
  @Patch(":customerCategoryId")
  @RequirePermission("customer-category.manage")
  @ApiOperation({ summary: "Update a customer category" })
  updateCustomerCategory(
    @Param("customerCategoryId", ParseUUIDPipe) customerCategoryId: string,
    @Body() updateCustomerCategoryDto: UpdateCustomerCategoryDto,
  ) {
    return this.customerCategoryService.updateCustomerCategory(
      customerCategoryId,
      updateCustomerCategoryDto,
    );
  }

  @Auditable({ module: AuditModule.CUSTOMER_CATEGORIES })
  @Delete(":customerCategoryId")
  @RequirePermission("customer-category.manage")
  @ApiOperation({ summary: "Delete a customer category" })
  async deleteCustomerCategory(
    @Param("customerCategoryId", ParseUUIDPipe) customerCategoryId: string,
  ) {
    await this.customerCategoryService.deleteCustomerCategory(customerCategoryId);
    return { message: "Customer category deleted successfully" };
  }
}
