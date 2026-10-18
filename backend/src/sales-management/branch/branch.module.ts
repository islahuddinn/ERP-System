import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CityModule } from "../city/city.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchRepository } from "./branch.repository";
import { BranchService } from "./branch.service";
import { BranchController } from "./branch.controller";

@Module({
  imports: [AuditModule, UsersModule, CityModule, EmployeeModule],
  providers: [BranchRepository, BranchService],
  controllers: [BranchController],
  exports: [BranchService],
})
export class BranchModule {}
