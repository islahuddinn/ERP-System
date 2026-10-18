import { Module } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { InvoicesController } from "./invoices.controller";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [InvoicesService],
  controllers: [InvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
