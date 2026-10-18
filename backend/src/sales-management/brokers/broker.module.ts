import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { BrokerRepository } from "./broker.repository";
import { BrokerService } from "./broker.service";
import { BrokerController } from "./broker.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [BrokerRepository, BrokerService],
  controllers: [BrokerController],
  exports: [BrokerService],
})
export class BrokerModule {}
