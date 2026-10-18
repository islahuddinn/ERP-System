import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { DepartmentRepository } from "./department.repository";
import { DepartmentService } from "./department.service";
import { DepartmentController } from "./department.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [DepartmentRepository, DepartmentService],
  controllers: [DepartmentController],
  exports: [DepartmentService],
})
export class DepartmentModule {}
