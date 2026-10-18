import { Module } from "@nestjs/common";
import { CustomersService } from "./customers.service";
import { CustomersController } from "./customers.controller";
import { CustomerRepository } from "./customers.repository";
import { CustomerCategoryModule } from "../customer-categories/customer-category.module";
import { AreaModule } from "../../sales-management/area/area.module";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [AuditModule, UsersModule, CustomerCategoryModule, AreaModule],
  controllers: [CustomersController],
  providers: [CustomersService, CustomerRepository],
  exports: [CustomersService, CustomerRepository],
})
export class CustomersModule {}
