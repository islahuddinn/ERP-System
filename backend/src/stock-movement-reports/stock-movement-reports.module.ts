import { Module } from "@nestjs/common";
import { StockMovementReportsController } from "./stock-movement-reports.controller";
import { StockMovementReportsService } from "./stock-movement-reports.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [StockMovementReportsController],
  providers: [StockMovementReportsService],
  exports: [StockMovementReportsService],
})
export class StockMovementReportsModule {}
