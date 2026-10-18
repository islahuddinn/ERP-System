import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MasterPrismaService } from "../../../master-prisma/master-prisma.service";

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, "super-admin-jwt") {
  constructor(
    private configService: ConfigService,
    private masterPrisma: MasterPrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET"),
    });
  }

  async validate(payload: any) {
    // Verify this is a super admin token
    if (payload.type !== "SUPER_ADMIN") {
      throw new UnauthorizedException("Invalid token type");
    }

    // Verify super admin still exists and is active
    const superAdmin = await this.masterPrisma.superAdminUser.findUnique({
      where: { id: payload.sub },
    });

    if (!superAdmin || !superAdmin.isActive) {
      throw new UnauthorizedException("Super admin account not found or inactive");
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      type: "SUPER_ADMIN",
    };
  }
}
