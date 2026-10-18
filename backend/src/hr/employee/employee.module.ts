import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { EmployeeRepository } from "./employee.repository";
import { EmployeeService } from "./employee.service";
import { EmployeeController } from "./employee.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [EmployeeRepository, EmployeeService],
  controllers: [EmployeeController],
  exports: [EmployeeService],
})
export class EmployeeModule {}
