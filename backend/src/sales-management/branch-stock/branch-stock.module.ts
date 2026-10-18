import { Module } from "@nestjs/common";
import { UsersModule } from "../../users/users.module";
import { BranchStockRepository } from "./branch-stock.repository";
import { BranchStockService } from "./branch-stock.service";
import { BranchStockController } from "./branch-stock.controller";

@Module({
  imports: [UsersModule],
  providers: [BranchStockRepository, BranchStockService],
  controllers: [BranchStockController],
  exports: [BranchStockRepository],
})
export class BranchStockModule {}
