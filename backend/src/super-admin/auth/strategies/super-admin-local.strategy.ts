import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { SuperAdminAuthService } from "../super-admin-auth.service";
import { IBaseSuperAdmin } from "src/super-admin/utils/interfaces";

@Injectable()
export class SuperAdminLocalStrategy extends PassportStrategy(Strategy, "super-admin-local") {
  constructor(private superAdminAuthService: SuperAdminAuthService) {
    super({
      usernameField: "email",
      passwordField: "password",
    });
  }

  async validate(email: string, password: string): Promise<IBaseSuperAdmin> {
    const superAdmin = await this.superAdminAuthService.validateSuperAdmin(email, password);

    if (!superAdmin) {
      throw new UnauthorizedException(`Invalid credentials`);
    }

    return superAdmin;
  }
}
