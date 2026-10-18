import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { SalesPersonAssignmentsRepository } from "./sales-person-assignments.repository";
import { SalesPersonAssignmentsService } from "./sales-person-assignments.service";
import { SalesPersonAssignmentsController } from "./sales-person-assignments.controller";

@Module({
  imports: [AuditModule, UsersModule, EmployeeModule, BranchModule],
  providers: [SalesPersonAssignmentsRepository, SalesPersonAssignmentsService],
  controllers: [SalesPersonAssignmentsController],
  exports: [SalesPersonAssignmentsService],
})
export class SalesPersonAssignmentsModule {}
