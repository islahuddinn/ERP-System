import { Module } from "@nestjs/common";
import { LocationsService } from "./locations.service";
import { LocationsController } from "./locations.controller";
import { LocationsRepository } from "./locations.repository";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [UsersModule, PrismaModule, AuditModule],
  providers: [LocationsService, LocationsRepository],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationsModule {}
