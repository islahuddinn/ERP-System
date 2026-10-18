import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { TransporterRepository } from "./transporter.repository";
import { TransporterService } from "./transporter.service";
import { TransporterController } from "./transporter.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [TransporterRepository, TransporterService],
  controllers: [TransporterController],
  exports: [TransporterService],
})
export class TransporterModule {}
