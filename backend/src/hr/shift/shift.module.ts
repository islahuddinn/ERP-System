import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ShiftRepository } from "./shift.repository";
import { ShiftService } from "./shift.service";
import { ShiftController } from "./shift.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [ShiftRepository, ShiftService],
  controllers: [ShiftController],
  exports: [ShiftService],
})
export class ShiftModule {}
