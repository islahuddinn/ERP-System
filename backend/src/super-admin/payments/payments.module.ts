import { Module } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { MasterPrismaModule } from "../../master-prisma/master-prisma.module";
import { PaymentsRepository } from "./payments.repository";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";

@Module({
  imports: [MasterPrismaModule, SubscriptionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService, PaymentsRepository],
})
export class PaymentsModule {}
