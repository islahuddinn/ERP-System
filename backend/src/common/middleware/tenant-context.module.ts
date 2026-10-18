import { Module, Scope } from "@nestjs/common";
import { TenantContextMiddleware } from "./tenant-context.middleware";
import { MultiTenantPrismaModule } from "../../prisma/multi-tenant-prisma.module";
import { AuthModule } from "../../auth/auth.module";
import { TenantPrismaService } from "src/prisma/tenant-prisma.service";
import { PrismaClient } from "@prisma/tenant-client";

/**
 * Module for tenant context middleware
 * Provides JWT service for token parsing via AuthModule
 */
@Module({
  imports: [
    MultiTenantPrismaModule,
    AuthModule, // Import AuthModule which exports JwtModule
  ],

  providers: [
    TenantContextMiddleware,

    {
      provide: PrismaClient,
      useFactory: () => new PrismaClient(),
      scope: Scope.REQUEST, // Required for request context
    },
    TenantPrismaService,
  ],
  exports: [TenantContextMiddleware, TenantPrismaService],
})
export class TenantContextModule {}
