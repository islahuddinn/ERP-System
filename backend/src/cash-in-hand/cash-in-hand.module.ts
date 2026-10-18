import { Module } from "@nestjs/common";
import { CashInHandController } from "./cash-in-hand.controller";
import { CashInHandService } from "./cash-in-hand.service";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [CashInHandController],
  providers: [CashInHandService],
  exports: [CashInHandService],
})
export class CashInHandModule {}
