import { forwardRef, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AuditService } from "./audit.service";
import { AuditController } from "./audit.controller";
import { AuditContextService } from "./audit-context.service";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [
    AuditService,
    AuditContextService,
    {
      // Register AuditInterceptor globally so every route decorated with
      // @Auditable() is automatically covered without per-module setup.
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [AuditController],
  exports: [AuditService, AuditContextService],
})
export class AuditModule {}
