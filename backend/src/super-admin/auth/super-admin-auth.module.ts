import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { SuperAdminAuthService } from "./super-admin-auth.service";
import { SuperAdminAuthController } from "./super-admin-auth.controller";
import { SuperAdminJwtStrategy } from "./strategies/super-admin-jwt.strategy";
import { SuperAdminLocalStrategy } from "./strategies/super-admin-local.strategy";
import { MasterPrismaModule } from "../../master-prisma/master-prisma.module";

@Module({
  imports: [
    MasterPrismaModule,
    PassportModule,
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
  providers: [SuperAdminAuthService, SuperAdminJwtStrategy, SuperAdminLocalStrategy],
  controllers: [SuperAdminAuthController],
  exports: [SuperAdminAuthService],
})
export class SuperAdminAuthModule {}
