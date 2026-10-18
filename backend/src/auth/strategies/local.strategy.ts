import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { Request } from "express";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    });
  }

  async validate(req: Request, email: string, password: string) {
    const tenantId = this.getTenantId(req);

    if (!tenantId) {
      throw new BadRequestException(`Tenant ID is required`);
    }

    /**
     * Defensive normalization (safe even if DTO already does it)
     */
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.authService.validateUser(normalizedEmail, password, tenantId);

    if (!user) {
      throw new UnauthorizedException(`Invalid credentials`);
    }

    return user;
  }

  private getTenantId(req: Request): string | null {
    // 1. body
    const { tenantId } = req.body;
    if (typeof tenantId === "string" && tenantId.trim()) {
      return tenantId.trim();
    }

    // 2. header
    const headerTenantId = req.headers["x-tenant-id"];

    if (typeof headerTenantId === "string" && headerTenantId.trim()) {
      return headerTenantId.trim();
    }

    if (Array.isArray(headerTenantId)) {
      const valid = headerTenantId.find((v) => v?.trim());
      if (valid) return valid.trim();
    }

    return null;
  }
}
