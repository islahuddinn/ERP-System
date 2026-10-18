import { Module } from "@nestjs/common";
import { FactoryReportsController } from "./factory-reports.controller";
import { FactoryReportsService } from "./factory-reports.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [FactoryReportsController],
  providers: [FactoryReportsService],
  exports: [FactoryReportsService],
})
export class FactoryReportsModule {}
