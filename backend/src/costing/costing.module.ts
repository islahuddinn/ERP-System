import { Module } from "@nestjs/common";
import { CostingController } from "./costing.controller";
import { CostingService } from "./costing.service";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [CommonServicesModule, UsersModule],
  controllers: [CostingController],
  providers: [CostingService],
  exports: [CostingService],
})
export class CostingModule {}
