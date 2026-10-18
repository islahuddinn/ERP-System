import { Module } from "@nestjs/common";
import { UOMsService } from "./uoms.service";
import { UOMsController } from "./uoms.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [PrismaModule, UsersModule, AuditModule],
  controllers: [UOMsController],
  providers: [UOMsService],
  exports: [UOMsService],
})
export class UOMsModule {}
