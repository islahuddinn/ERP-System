import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { CreateTenantDto } from "./dto/create-tenant.dto";
import { UpdateTenantDto } from "./dto/update-tenant.dto";
import {
  TenantStatus,
  Prisma,
  SuperAdminAuditAction,
  SuperAdminAuditEntityType,
  Tenant,
} from "@prisma/master-client";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { ShortIdService } from "../../common/services/short-id.service";
import { TenantResolverService } from "../../common/services/tenant-resolver.service";
import { CloudinaryService } from "../../common/services/cloudinary.service";
import { UpdateBrandingDto } from "../../auth/dto/update-branding.dto";
import * as bcrypt from "bcrypt";
import { SuperAdminAuditService } from "../audit/super-admin-audit.service";
import { TenantQueryDto } from "./dto/find-all-tenants-query.dto";
import { TenantsRepository } from "./tenant-repository";
import { getTotalPages } from "src/common/reuseable-functions/getTotalPages";
import { UpdateTenantStatusDto } from "./dto/create-tenant-status.dto";
import { RequestWithSuperAdminUser } from "src/common/interfaces";

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantProvisioningService: TenantProvisioningService,
    private readonly multiTenantPrisma: MultiTenantPrismaService,
    private readonly shortIdService: ShortIdService,
    private readonly tenantResolver: TenantResolverService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly superAdminAuditService: SuperAdminAuditService,
    private readonly tenantRepository: TenantsRepository,
  ) {}

  private sanitizeTenant<T extends Record<string, any>>(tenant: T): Omit<T, "databaseUrl"> {
    const { databaseUrl, ...rest } = tenant;
    return rest as Omit<T, "databaseUrl">;
  }

  // ── CRUD ────────────────────────────────────────────────────────────────────

  async create(createTenantDto: CreateTenantDto, req: RequestWithSuperAdminUser) {
    const { name, email, adminEmail, adminPassword, subdomain } = createTenantDto;

    const finalSubdomain = subdomain || name.replace(/\s+/g, "-").toLowerCase();

    const existing = await this.tenantRepository.findOne({
      OR: [{ email }, { subdomain: finalSubdomain }],
    });

    if (existing) {
      throw new ConflictException("Tenant already exists with the same email or subdomain.");
    }

    const shortTenantId = await this.shortIdService.generateUnique((candidate) =>
      this.tenantRepository.existsByShortTenantId(candidate),
    );

    const tenantId = randomUUID();
    const schemaName = `tenant_${shortTenantId}`;

    // Provision schema first — no master record yet, so no ghost tenant on failure
    await this.tenantProvisioningService.provisionSchemaTenant({
      tenantId,
      schemaName,
      adminEmail,
      adminPassword,
      shortTenantId,
    });

    // Write master record only after provisioning fully succeeds
    const tenant = await this.tenantRepository.create({
      id: tenantId,
      name,
      email,
      subdomain: finalSubdomain,
      shortTenantId,
      schemaName,
      status: TenantStatus.ACTIVE,
      brandingName: name,
      brandingLogoUrl: "/images/logo.png",
    });

    await this.superAdminAuditService.createAuditLog({
      actorId: req.user.id,
      action: SuperAdminAuditAction.CREATED,
      entityType: SuperAdminAuditEntityType.TENANT,
      entityId: tenant.id,
      oldData: null,
      newData: tenant,
    });

    return this.sanitizeTenant(tenant);
  }

  async findAll(query: TenantQueryDto) {
    const { page = 1, limit = 20 } = query;

    const [tenants, total] = await this.tenantRepository.findAll(query);

    return {
      data: tenants.map((t) => this.sanitizeTenant(t)),
      meta: {
        page,
        limit,
        total,
        totalPages: getTotalPages(total, limit),
      },
    };
  }

  async findOne(id: string) {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant || tenant?.deletedAt !== null) throw new NotFoundException("Tenant not found.");

    let adminEmail: string | null = null;
    try {
      const tenantClient = await this.multiTenantPrisma.getTenantClient(tenant.id);
      const adminUser = await tenantClient.user.findFirst({
        where: { role: { name: "Admin", isSystem: true } },
        orderBy: { createdAt: "asc" },
        select: { email: true },
      });
      adminEmail = adminUser?.email ?? null;
    } catch {
      adminEmail = null;
    }

    return { ...this.sanitizeTenant(tenant as any), adminEmail };
  }

  async update(tenantId: string, dto: UpdateTenantDto, req: RequestWithSuperAdminUser) {
    const existingTenant = await this.checkExistence({ id: tenantId, deletedAt: null });

    const { name, phone, address, email, subdomain, brandingName } = dto;

    const updateData: Prisma.TenantUpdateInput = {};

    if (email) {
      if (await this.tenantRepository.existsByEmail(email, tenantId)) {
        throw new ConflictException("Tenant with this email already exists.");
      }
      updateData.email = email;
    }

    if (subdomain !== undefined) {
      const normalizedSubdomain = subdomain?.trim() || null;
      if (
        normalizedSubdomain &&
        (await this.tenantRepository.existsBySubdomain(normalizedSubdomain, tenantId))
      ) {
        throw new ConflictException("Tenant with this subdomain already exists.");
      }
      updateData.subdomain = normalizedSubdomain;
    }

    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (brandingName) updateData.brandingName = brandingName;

    const updatedTenant = await this.tenantRepository.update(tenantId, updateData);

    await this.superAdminAuditService.createAuditLog({
      actorId: req.user.id,
      action: SuperAdminAuditAction.UPDATED,
      entityType: SuperAdminAuditEntityType.TENANT,
      entityId: tenantId,
      oldData: existingTenant,
      newData: updatedTenant,
    });

    return this.sanitizeTenant(updatedTenant as any);
  }

  async updateStatus(tenantId: string, dto: UpdateTenantStatusDto, req: RequestWithSuperAdminUser) {
    const { status, suspensionReason } = dto;

    const existingTenant = await this.checkExistence({ id: tenantId, deletedAt: null });

    if (existingTenant.status === status) {
      throw new BadRequestException(`Tenant is already ${status}.`);
    }

    if (status === TenantStatus.SUSPENDED && !suspensionReason?.trim()) {
      throw new BadRequestException("Suspension reason is required when suspending a tenant.");
    }

    const updatedTenant = await this.tenantRepository.update(tenantId, {
      status,
      suspensionReason: status === TenantStatus.SUSPENDED ? suspensionReason : null,
    });

    await this.multiTenantPrisma.refreshTenantStatus(tenantId);

    await this.superAdminAuditService.createAuditLog({
      actorId: req.user.id,
      action: SuperAdminAuditAction.UPDATED,
      entityType: SuperAdminAuditEntityType.TENANT,
      entityId: tenantId,
      oldData: existingTenant,
      newData: updatedTenant,
    });

    return this.sanitizeTenant(updatedTenant as any);
  }

  async softDelete(tenantId: string, req: RequestWithSuperAdminUser) {
    const existingTenant = await this.checkExistence({ id: tenantId, deletedAt: null });

    const updatedTenant = await this.tenantRepository.update(tenantId, {
      deletedAt: new Date(),
      status: TenantStatus.INACTIVE,
    });

    await this.multiTenantPrisma.refreshTenantStatus(tenantId);

    await this.superAdminAuditService.createAuditLog({
      actorId: req.user.id,
      action: SuperAdminAuditAction.DELETED,
      entityType: SuperAdminAuditEntityType.TENANT,
      entityId: tenantId,
      oldData: existingTenant,
      newData: updatedTenant,
      metadata: { notes: "Soft delete" },
    });

    return this.sanitizeTenant(updatedTenant as any);
  }

  async restoreTenant(tenantId: string, req: RequestWithSuperAdminUser) {
    const existingTenant = await this.checkExistence({ id: tenantId, deletedAt: { not: null } });

    if (!existingTenant.deletedAt) {
      throw new BadRequestException("Tenant is not deleted.");
    }

    const updatedTenant = await this.tenantRepository.update(tenantId, {
      deletedAt: null,
      status: TenantStatus.ACTIVE,
    });

    await this.multiTenantPrisma.refreshTenantStatus(tenantId);

    await this.superAdminAuditService.createAuditLog({
      actorId: req.user.id,
      action: SuperAdminAuditAction.UPDATED,
      entityType: SuperAdminAuditEntityType.TENANT,
      entityId: tenantId,
      oldData: existingTenant,
      newData: updatedTenant,
      metadata: { notes: "Restored tenant" },
    });

    return this.sanitizeTenant(updatedTenant as any);
  }

  async checkExistence(query: Prisma.TenantWhereInput): Promise<Tenant> {
    const tenant = await this.tenantRepository.findOne(query);
    if (!tenant) throw new NotFoundException("Tenant not found.");
    return tenant;
  }

  // ── Branding ────────────────────────────────────────────────────────────────

  async getTenantBranding(tenantIdentifier: string) {
    const tenantId = await this.resolveTenantIdentifier(tenantIdentifier);

    const tenant = await this.tenantRepository.findBranding(tenantId);
    if (!tenant) throw new NotFoundException("Tenant not found.");

    return this.formatBranding(tenant);
  }

  async updateTenantBranding(
    tenantIdentifier: string,
    dto: UpdateBrandingDto,
    file?: Express.Multer.File,
  ) {
    const tenantId = await this.resolveTenantIdentifier(tenantIdentifier);

    const tenant = await this.tenantRepository.findBranding(tenantId);
    if (!tenant) throw new NotFoundException("Tenant not found.");

    let { brandingLogoUrl, brandingLogoId } = tenant;

    if (dto.deleteLogo) {
      if (tenant.brandingLogoId) await this.cloudinaryService.deleteLogo(tenant.brandingLogoId);
      brandingLogoUrl = null;
      brandingLogoId = null;
    } else if (file) {
      const uploaded = await this.cloudinaryService.uploadLogo(file, tenantId);
      if (brandingLogoId) await this.cloudinaryService.deleteLogo(brandingLogoId);
      brandingLogoUrl = uploaded.url;
      brandingLogoId = uploaded.publicId;
    }

    const updatedTenant = await this.tenantRepository.updateBranding(tenantId, {
      brandingName: dto.brandingName ?? tenant.brandingName ?? tenant.name,
      brandingLogoUrl,
      brandingLogoId,
    });

    return this.formatBranding(updatedTenant);
  }

  // ── User management ──────────────────────────────────────────────────────────

  async updateTenantUserPassword(
    tenantIdentifier: string,
    email: string,
    newPassword: string,
    updatedBy: "SUPER_ADMIN" | "TENANT" = "SUPER_ADMIN",
  ) {
    const tenantId = await this.resolveTenantIdentifier(tenantIdentifier);

    const tenantClient = await this.multiTenantPrisma.getTenantClient(tenantId);

    const user = await tenantClient.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException("User not found in tenant.");

    await tenantClient.user.update({
      where: { id: user.id },
      data: { password: await bcrypt.hash(newPassword, 10) },
    });
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private formatBranding(tenant: {
    name: string;
    brandingName: string | null;
    brandingLogoUrl: string | null;
    brandingLogoId: string | null;
  }) {
    return {
      name: tenant.brandingName || tenant.name,
      logoUrl: tenant.brandingLogoUrl || "/images/logo.png",
      logoId: tenant.brandingLogoId,
    };
  }

  private async resolveTenantIdentifier(identifier: string): Promise<string> {
    const tenantId = await this.tenantResolver.resolveToId(identifier);
    if (!tenantId) throw new NotFoundException("Tenant not found.");
    return tenantId;
  }
}
