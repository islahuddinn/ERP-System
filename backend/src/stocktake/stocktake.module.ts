import { Module } from "@nestjs/common";
import { StocktakeService } from "./stocktake.service";
import { StocktakeController } from "./stocktake.controller";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [CommonServicesModule, UsersModule],
  providers: [StocktakeService],
  controllers: [StocktakeController],
  exports: [StocktakeService],
})
export class StocktakeModule {}
