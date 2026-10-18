import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException, ForbiddenException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { LoginAccess } from "@prisma/tenant-client";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { TenantLifecycleService } from "../../common/services/tenant-lifecycle.service";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private masterPrisma: MasterPrismaService,
    private tenantLifecycleService: TenantLifecycleService,
    private multiTenantPrisma: MultiTenantPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    // Check if this is a super admin token (has type: 'SUPER_ADMIN')
    if (payload.type === "SUPER_ADMIN") {
      // Super admin tokens don't need tenant validation
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        type: "SUPER_ADMIN",
      };
    }

    // For tenant tokens, validate tenantId exists and tenant is active
    if (payload.tenantId) {
      try {
        await this.tenantLifecycleService.validateOrThrow(payload.tenantId);

        if (payload.loginAccess === LoginAccess.DISABLED) {
          throw new UnauthorizedException("This account does not have login access. Contact your administrator.");
        }
        if (payload.loginAccess === LoginAccess.SUSPENDED) {
          throw new UnauthorizedException("This account has been suspended. Contact your administrator.");
        }

        // Force logout after a password change (#13): reject tokens issued before the
        // user's passwordChangedAt. iat is in seconds; compare against the stored time.
        const tenantClient = await this.multiTenantPrisma.getTenantClient(payload.tenantId);
        const dbUser = await tenantClient.user.findUnique({
          where: { id: payload.sub },
          select: { passwordChangedAt: true },
        });
        if (dbUser?.passwordChangedAt && payload.iat) {
          const changedAtSeconds = Math.floor(dbUser.passwordChangedAt.getTime() / 1000);
          if (payload.iat < changedAtSeconds) {
            throw new UnauthorizedException(
              "Your session has expired due to a password change. Please log in again.",
            );
          }
        }

        return {
          id: payload.sub,
          email: payload.email,
          roleId: payload.roleId,
          tenantId: payload.tenantId,
          loginAccess: payload.loginAccess,
          type: payload.type || "TENANT",
        };
      } catch (error: any) {
        if (error instanceof UnauthorizedException) {
          throw error;
        }
        if (error instanceof ForbiddenException) {
          throw error;
        }
        this.logger.error(`Error validating tenant in JWT: ${error.message}`);
        throw new UnauthorizedException("Invalid token");
      }
    }

    // If no tenantId and not super admin, token is invalid for multi-tenant system
    this.logger.warn("JWT token missing tenantId and not super admin");
    throw new UnauthorizedException("Invalid token: tenant ID required");
  }
}
