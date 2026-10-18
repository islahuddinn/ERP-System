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
import { SuppliersService } from "./suppliers.service";
import { CreateSupplierDto } from "./dto/create-supplier.dto";
import { UpdateSupplierDto } from "./dto/update-supplier.dto";
import { SupplierQueryDto } from "./dto/supplier-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditModule } from "@prisma/tenant-client";

@ApiTags("Suppliers")
@Controller("suppliers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Auditable({ module: AuditModule.SUPPLIERS })
  @Post()
  @RequirePermission("suppliers.create")
  @ApiOperation({ summary: "Create a new supplier" })
  create(@Body() dto: CreateSupplierDto, @Req() req: RequestWithUser) {
    return this.suppliersService.create(dto, req);
  }

  @Get("dropdown")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get minimal supplier list for dropdowns" })
  dropdown() {
    return this.suppliersService.dropdown();
  }

  @Get()
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get all suppliers with pagination and filters" })
  findAll(@Query() queryDto: SupplierQueryDto) {
    return this.suppliersService.findAll(queryDto);
  }

  @Get(":id")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get supplier by ID" })
  findOne(@Param("id") id: string) {
    return this.suppliersService.findOne(id);
  }

  @Auditable({ module: AuditModule.SUPPLIERS })
  @Patch(":id")
  @RequirePermission("suppliers.update")
  @ApiOperation({ summary: "Update supplier" })
  update(@Param("id") id: string, @Body() dto: UpdateSupplierDto, @Req() req: RequestWithUser) {
    return this.suppliersService.update(id, dto, req);
  }

  @Auditable({ module: AuditModule.SUPPLIERS })
  @Delete(":id")
  @RequirePermission("suppliers.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft delete supplier" })
  remove(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.suppliersService.remove(id, req);
  }

  @Auditable({ module: AuditModule.SUPPLIERS })
  @Patch(":id/toggle-active")
  @RequirePermission("suppliers.update")
  @ApiOperation({ summary: "Toggle supplier active status" })
  toggleActive(@Param("id") id: string, @Req() req: RequestWithUser) {
    return this.suppliersService.toggleActive(id, req);
  }
}
