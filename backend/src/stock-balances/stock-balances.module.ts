import { Module } from "@nestjs/common";
import { StockBalancesService } from "./stock-balances.service";
import { StockBalancesController } from "./stock-balances.controller";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [StockBalancesService],
  controllers: [StockBalancesController],
  exports: [StockBalancesService],
})
export class StockBalancesModule {}
