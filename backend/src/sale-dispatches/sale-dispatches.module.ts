import { Module } from "@nestjs/common";
import { SaleDispatchesController } from "./sale-dispatches.controller";
import { SaleDispatchesService } from "./sale-dispatches.service";
import { SaleDispatchesRepository } from "./sale-dispatches.repository";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [SaleDispatchesController],
  providers: [SaleDispatchesService, SaleDispatchesRepository],
  exports: [SaleDispatchesService],
})
export class SaleDispatchesModule {}
