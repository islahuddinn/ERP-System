import { Module } from "@nestjs/common";
import { SalesReportsController } from "./sales-reports.controller";
import { SalesReportsService } from "./sales-reports.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SalesReportsController],
  providers: [SalesReportsService],
  exports: [SalesReportsService],
})
export class SalesReportsModule {}
