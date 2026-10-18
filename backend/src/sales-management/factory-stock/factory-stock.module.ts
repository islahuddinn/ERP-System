import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { FactoryStockRepository } from "./factory-stock.repository";
import { FactoryStockService } from "./factory-stock.service";
import { FactoryStockController } from "./factory-stock.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [FactoryStockRepository, FactoryStockService],
  controllers: [FactoryStockController],
  exports: [FactoryStockRepository],
})
export class FactoryStockModule {}
