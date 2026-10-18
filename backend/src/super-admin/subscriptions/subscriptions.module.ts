import { Module } from "@nestjs/common";
import { SubscriptionsService } from "./subscriptions.service";
import { SubscriptionsController } from "./subscriptions.controller";
import { MasterPrismaModule } from "../../master-prisma/master-prisma.module";
import { SubscriptionsRepository } from "./subscriptions-repository";

@Module({
  imports: [MasterPrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
