import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersModule } from "../../users/users.module";
import { VendorController } from "./controllers/vendor.controller";
import { BillController } from "./controllers/bill.controller";
import { PaymentController } from "./controllers/payment.controller";
import { AgingController } from "./controllers/aging.controller";
import { VendorService } from "./services/vendor.service";
import { BillService } from "./services/bill.service";
import { PaymentService } from "./services/payment.service";
import { AgingService } from "./services/aging.service";
import { JournalModule } from "../journal/journal.module";
import { CoaModule } from "../coa/coa.module";
import { BillRepository } from "./repositories/bill.repository";
import { PaymentRepository } from "./repositories/payment.repository";

@Module({
  imports: [PrismaModule, UsersModule, JournalModule, CoaModule],
  controllers: [VendorController, BillController, PaymentController, AgingController],
  providers: [
    VendorService,
    BillService,
    PaymentService,
    AgingService,
    BillRepository,
    PaymentRepository,
  ],
  exports: [VendorService, BillService, PaymentService],
})
export class ApModule {}
