import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersModule } from "../../users/users.module";
import { JournalModule } from "../journal/journal.module";
import { ArInvoiceController } from "./controllers/invoice.controller";
import { ArPaymentController } from "./controllers/payment.controller";
import { ArAgingController } from "./controllers/aging.controller";
import { InvoiceService } from "./services/invoice.service";
import { PaymentService } from "./services/payment.service";
import { AgingService } from "./services/aging.service";
import { InvoiceRepository } from "./repositories/invoice.repository";
import { PaymentRepository } from "./repositories/payment.repository";

@Module({
  imports: [PrismaModule, UsersModule, JournalModule],
  controllers: [ArInvoiceController, ArPaymentController, ArAgingController],
  providers: [
    InvoiceService,
    PaymentService,
    AgingService,
    InvoiceRepository,
    PaymentRepository,
  ],
  exports: [InvoiceService, PaymentService, AgingService],
})
export class ArModule {}

