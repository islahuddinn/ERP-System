import { Module } from "@nestjs/common";
import { SuperAdminAuthModule } from "./auth/super-admin-auth.module";
import { TenantsModule } from "./tenants/tenants.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { PaymentsModule } from "./payments/payments.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { SuperAdminAuditModule } from "./audit/super-admin-audit.module";

@Module({
  imports: [
    SuperAdminAuthModule,
    TenantsModule,
    SubscriptionsModule,
    PaymentsModule,
    AnalyticsModule,
    SuperAdminAuditModule,
  ],
  exports: [
    SuperAdminAuthModule,
    TenantsModule,
    SubscriptionsModule,
    PaymentsModule,
    AnalyticsModule,
    SuperAdminAuditModule,
  ],
})
export class SuperAdminModule {}
