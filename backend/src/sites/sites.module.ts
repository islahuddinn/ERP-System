import { Module } from "@nestjs/common";
import { SitesService } from "./sites.service";
import { SitesController } from "./sites.controller";
import { SitesRepository } from "./sites.repository";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [UsersModule, PrismaModule, AuditModule],
  providers: [SitesService, SitesRepository],
  controllers: [SitesController],
  exports: [SitesService],
})
export class SitesModule {}
