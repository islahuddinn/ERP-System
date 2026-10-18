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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Express } from "express";
import { SuperAdminJwtAuthGuard } from "../auth/guards/super-admin-jwt-auth.guard";
import { TenantsService } from "./tenants.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import { UpdateTenantStatusDto } from "./dto/create-tenant-status.dto";
import { SuperAdminChangePasswordDto } from "./dto/super-admin-change-password.dto";
import { UpdateBrandingDto } from "../../auth/dto/update-branding.dto";
import { TenantQueryDto } from "./dto/find-all-tenants-query.dto";
import { RequestWithSuperAdminUser } from "src/common/interfaces";

const brandingUploadOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_: any, file: Express.Multer.File, cb: CallableFunction) => {
    const allowed = ["image/png", "image/jpeg", "image/webp"];
    cb(
      allowed.includes(file.mimetype)
        ? null
        : new BadRequestException("Only PNG, JPEG, and WEBP files are allowed."),
      allowed.includes(file.mimetype),
    );
  },
};

@ApiTags("Super Admin - Tenants")
@Controller("super-admin/tenants")
@UseGuards(SuperAdminJwtAuthGuard)
@ApiBearerAuth()
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ── CRUD ────────────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: "Create a new tenant and provision its database" })
  create(@Body() createTenantDto: CreateTenantDto, @Req() req: RequestWithSuperAdminUser) {
    return this.tenantsService.create(createTenantDto, req);
  }

  @Get()
  @ApiOperation({ summary: "List all tenants with pagination and filters" })
  findAll(@Query() tenantQueryDto: TenantQueryDto) {
    return this.tenantsService.findAll(tenantQueryDto);
  }

  @Get(":tenantId")
  @ApiOperation({ summary: "Get a single tenant by ID" })
  findOne(@Param("tenantId") tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Patch(":tenantId")
  @ApiOperation({ summary: "Update tenant details" })
  update(
    @Param("tenantId") tenantId: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req: RequestWithSuperAdminUser,
  ) {
    return this.tenantsService.update(tenantId, updateTenantDto, req);
  }

  @Patch(":tenantId/status")
  @ApiOperation({ summary: "Update tenant status (active / suspended / inactive)" })
  updateStatus(
    @Param("tenantId") tenantId: string,
    @Body() updateTenantStatusDto: UpdateTenantStatusDto,
    @Req() req: RequestWithSuperAdminUser,
  ) {
    return this.tenantsService.updateStatus(tenantId, updateTenantStatusDto, req);
  }

  @Delete(":tenantId")
  @ApiOperation({ summary: "Soft-delete a tenant" })
  softDelete(@Param("tenantId") tenantId: string, @Req() req: RequestWithSuperAdminUser) {
    return this.tenantsService.softDelete(tenantId, req);
  }

  @Post(":tenantId/restore")
  @ApiOperation({ summary: "Restore a soft-deleted tenant" })
  restoreTenant(@Param("tenantId") tenantId: string, @Req() req: RequestWithSuperAdminUser) {
    return this.tenantsService.restoreTenant(tenantId, req);
  }

  // ── Branding ────────────────────────────────────────────────────────────────

  @Get(":tenantId/branding")
  @ApiOperation({ summary: "Get tenant branding (name and logo)" })
  getBranding(@Param("tenantId") tenantId: string) {
    return this.tenantsService.getTenantBranding(tenantId);
  }

  @Patch(":tenantId/branding")
  @UseInterceptors(FileInterceptor("logo", brandingUploadOptions))
  @ApiOperation({ summary: "Update tenant branding name and/or logo" })
  updateBranding(
    @Param("tenantId") tenantId: string,
    @Body() updateBrandingDto: UpdateBrandingDto,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    return this.tenantsService.updateTenantBranding(tenantId, updateBrandingDto, logo);
  }

  // ── User management ──────────────────────────────────────────────────────────

  @Post(":tenantId/users/:userEmail/password")
  @ApiOperation({ summary: "Reset a tenant user password (super admin action)" })
  updateUserPassword(
    @Param("tenantId") tenantId: string,
    @Param("userEmail") userEmail: string,
    @Body() superAdminChangePasswordDto: SuperAdminChangePasswordDto,
  ) {
    return this.tenantsService.updateTenantUserPassword(
      tenantId,
      decodeURIComponent(userEmail),
      superAdminChangePasswordDto.newPassword,
      "SUPER_ADMIN",
    );
  }
}
