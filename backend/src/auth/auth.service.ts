import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { MultiTenantPrismaService } from "../prisma/multi-tenant-prisma.service";
import { MasterPrismaService } from "../master-prisma/master-prisma.service";
import { PrismaService } from "../prisma/prisma.service";
import { TenantResolverService } from "../common/services/tenant-resolver.service";
import { PasswordEncryptionService } from "../common/services/password-encryption.service";
import { CloudinaryService } from "../common/services/cloudinary.service";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import { AuditService } from "../audit/audit.service";
import { TenantLifecycleService } from "../common/services/tenant-lifecycle.service";
import { AuthHelpers } from "./auth.helpers";
import { PermissionsService } from "../users/permissions/permissions.service";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { LoginDto } from "./dto/login.dto";
import { IAccessTokenPayload, ILoginResponse, ILoginUser } from "./utils/interfaces";
import { RequestWithUser, ResponseDto } from "src/common/interfaces";
import { IBaseUser, IValidateUserResponse } from "src/users/utils/interfaces";
import { Request } from "express";
import { EPayloadType } from "src/common/enums";
import { verifyPassword } from "src/common/reuseable-functions/verifyPassword";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private multiTenantPrisma: MultiTenantPrismaService,
    private masterPrisma: MasterPrismaService,
    private prisma: PrismaService,
    private tenantResolver: TenantResolverService,
    private passwordEncryptionService: PasswordEncryptionService,
    private cloudinaryService: CloudinaryService,
    private auditService: AuditService,
    private tenantLifecycleService: TenantLifecycleService,
    private readonly authHelpers: AuthHelpers,
    private readonly permissionsService: PermissionsService,
    private readonly tenantPrismaContext: TenantPrismaContextService,
  ) {}

  async testConnection(tenantId: string, req: RequestWithUser) {
    try {
      // 1. Security check (VERY important)
      if (req.user.tenantId !== tenantId) {
        throw new UnauthorizedException("Access denied for this tenant");
      }

      // 2. Get tenant client
      const client = await this.multiTenantPrisma.getTenantClient(tenantId);

      // 3. Real DB health check (better than count)
      await client.$queryRaw`SELECT 1`;

      // 4. Optional lightweight metric
      const userCount = await client.user.count();

      return {
        success: true,
        message: `Connection successful`,
        userCount,
        tenantId,
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed`,
        tenantId,
      };
    }
  }

  async validateUser(
    email: string,
    password: string,
    shortTenantId: string,
  ): Promise<IValidateUserResponse | null> {
    // Resolves shortTenantId → canonical UUID + schema-scoped client
    const { client: tenantClient, tenantId } =
      await this.multiTenantPrisma.getClient(shortTenantId);

    const user = await tenantClient.user.findFirst({
      where: { email: { equals: email.trim(), mode: "insensitive" }, deletedAt: null },
      include: { role: { select: { id: true, name: true } } },
    });

    if (!user) return null;

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      this.logger.warn(`Invalid password for: ${email}`);
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.loginAccess === "DISABLED") {
      throw new UnauthorizedException(
        "This account does not have login access. Contact your administrator.",
      );
    }

    if (user.loginAccess === "SUSPENDED") {
      throw new UnauthorizedException(
        "This account has been suspended. Contact your administrator.",
      );
    }

    return { ...user, tenantId }; // JWT will carry UUID, not shortTenantId
  }

  // async validateUser(
  //   email: string,
  //   password: string,
  //   tenantId: string,
  // ): Promise<IValidateUserResponse | null> {
  //   const tenant = await this.resolveTenant(tenantId);

  //   if (!tenant) {
  //     throw new NotFoundException(`Tenant not found`);
  //   }

  //   await this.tenantLifecycleService.validateOrThrow(tenant.id);

  //   /**
  //    * Get tenant database client
  //    */
  //   const tenantClient = await this.multiTenantPrisma.getTenantClient(tenant.id);

  //   // const tenantClient = await this.multiTenantPrisma.getTenantClientBySchemaName(
  //   //   tenant.schemaName,
  //   // );

  //   const emailTrimmed = email?.trim() ?? "";

  //   const user = await tenantClient.user.findFirst({
  //     where: { email: { equals: emailTrimmed, mode: "insensitive" }, tenantId },
  //   });

  //   if (!user) return null;

  //   const isPasswordValid = await verifyPassword(password, user.password);

  //   if (!isPasswordValid) {
  //     this.logger.warn(`Invalid login attempt for: ${email}`);
  //     throw new UnauthorizedException("Invalid credentials");
  //   }

  //   if (user.loginAccess === "DISABLED") {
  //     throw new UnauthorizedException("This account does not have login access. Contact your administrator.");
  //   }
  //   if (user.loginAccess === "SUSPENDED") {
  //     throw new UnauthorizedException("This account has been suspended. Contact your administrator.");
  //   }

  //   return { ...user, tenantId: tenant.id };
  // }

  async login(req: RequestWithUser, loginDto: LoginDto): Promise<ResponseDto<ILoginResponse>> {
    const { user } = req;

    if (!user) {
      throw new UnauthorizedException(`Invalid credentials`);
    }

    const { id: userId, firstName, lastName, roleId, email, tenantId, loginAccess } = user;

    const payload: IAccessTokenPayload = {
      sub: userId,
      email,
      roleId,
      tenantId,
      loginAccess,
      type: EPayloadType.TENANT,
    };

    const access_token = this.authHelpers.generateAccessToken(payload);

    // /auth routes are excluded from TenantContextMiddleware, so PrismaService has no
    // tenant client bound in AsyncLocalStorage here — bind one manually before querying.
    const tenantClient = await this.multiTenantPrisma.getTenantClient(tenantId);
    const permissions = await this.tenantPrismaContext.runWithTenantClient(tenantClient, () =>
      this.permissionsService.getPermissionsByRoleIdGroupedByModule(roleId),
    );

    // Only expose what the frontend needs — never the raw DB row (it carries the
    // password hash, roleId, createdById, and timestamps that have no use client-side).
    const loginUser: ILoginUser = {
      id: userId,
      firstName,
      lastName,
      email,
      loginAccess,
      role: user.role?.name,
    };

    return {
      message: `Logged in successfully`,
      data: { access_token, user: loginUser, permissions },
    };
  }

  /**
   * Refresh JWT token (must include tenantId)
   * @param user - User object (must include tenantId)
   * @returns New access token
   */
  async refreshToken(user: IBaseUser) {
    if (!user.tenantId) {
      throw new BadRequestException(`Tenant ID is required for token refresh`);
    }

    const payload: IAccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roleId: user.roleId,
      tenantId: user.tenantId,
      loginAccess: user.loginAccess,
      type: EPayloadType.TENANT,
    };

    const token = this.authHelpers.generateAccessToken(payload);

    return { access_token: token };
  }

  private formatBranding(tenant: {
    name: string;
    brandingName: string | null;
    brandingLogoUrl: string | null;
    brandingLogoId: string | null;
  }) {
    return {
      name: tenant.brandingName?.trim() || tenant.name || "Malind Tech",
      logoUrl: tenant.brandingLogoUrl || "/images/logo.png",
      logoId: tenant.brandingLogoId,
    };
  }

  private async getTenantBrandingInternal(tenantId: string) {
    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        shortTenantId: true,
        brandingName: true,
        brandingLogoUrl: true,
        brandingLogoId: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    return this.formatBranding({
      name: tenant.name,
      brandingName: tenant.brandingName,
      brandingLogoUrl: tenant.brandingLogoUrl,
      brandingLogoId: tenant.brandingLogoId,
    });
  }

  async getBranding(authenticatedUser: any) {
    if (!authenticatedUser?.tenantId) {
      throw new ForbiddenException("Branding is only available for tenant users");
    }

    return this.getTenantBrandingInternal(authenticatedUser.tenantId);
  }

  async updateBranding(
    authenticatedUser: any,
    updateBrandingDto: UpdateBrandingDto,
    logo?: Express.Multer.File,
  ) {
    if (!authenticatedUser?.tenantId) {
      throw new ForbiddenException("Branding updates are only available for tenant users");
    }

    const tenant = await this.masterPrisma.tenant.findUnique({
      where: { id: authenticatedUser.tenantId },
      select: {
        name: true,
        brandingName: true,
        brandingLogoUrl: true,
        brandingLogoId: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }

    let brandingLogoUrl = tenant.brandingLogoUrl;
    let brandingLogoId = tenant.brandingLogoId;

    if (updateBrandingDto.deleteLogo) {
      brandingLogoUrl = null;
      brandingLogoId = null;
    } else if (logo) {
      // Store the logo inline as a base64 data URI on the tenant record. This
      // keeps branding self-contained with no external image host: the previous
      // Cloudinary path 500'd because Cloudinary is not configured in this
      // environment. (Multer memoryStorage gives us logo.buffer + logo.mimetype.)
      brandingLogoUrl = `data:${logo.mimetype};base64,${logo.buffer.toString("base64")}`;
      brandingLogoId = null;
    }

    const requestedName = updateBrandingDto.brandingName?.trim();
    const brandingName =
      requestedName && requestedName.length > 0
        ? requestedName
        : tenant.brandingName?.trim() || tenant.name;

    const updatedTenant = await this.masterPrisma.tenant.update({
      where: { id: authenticatedUser.tenantId },
      data: {
        brandingName,
        brandingLogoUrl,
        brandingLogoId,
      },
      select: {
        name: true,
        brandingName: true,
        brandingLogoUrl: true,
        brandingLogoId: true,
      },
    });

    return this.formatBranding(updatedTenant);
  }

  private async resolveTenant(identifier: string) {
    const tenantId = await this.tenantResolver.resolveToId(identifier);

    if (!tenantId) return null;

    return this.masterPrisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        schemaName: true,
        brandingName: true,
        brandingLogoUrl: true,
        brandingLogoId: true,
      },
    });
  }
}
