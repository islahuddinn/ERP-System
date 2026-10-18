import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { UsersModule } from "../users/users.module";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { MasterPrismaModule } from "../master-prisma/master-prisma.module";
import { CloudinaryService } from "../common/services/cloudinary.service";
import { AuditModule } from "../audit/audit.module";
import { AuthHelpers } from "./auth.helpers";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MultiTenantPrismaModule, // ← NEW: For tenant database access
    MasterPrismaModule, // ← NEW: For tenant validation
    AuditModule, // ← NEW: For login auditing
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRES_IN") || "24h",
        },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    CloudinaryService,
    AuthHelpers,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, AuthHelpers], // Export JwtModule and AuthHelpers so they can be used in other modules
})
export class AuthModule {}
