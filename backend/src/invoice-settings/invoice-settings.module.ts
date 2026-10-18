import { Module } from "@nestjs/common";
import { InvoiceSettingsService } from "./invoice-settings.service";
import { InvoiceSettingsController } from "./invoice-settings.controller";

@Module({
  controllers: [InvoiceSettingsController],
  providers: [InvoiceSettingsService],
  exports: [InvoiceSettingsService],
})
export class InvoiceSettingsModule {}
