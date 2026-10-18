import { Module } from "@nestjs/common";
import { RawMaterialsController } from "./raw-materials.controller";
import { RawMaterialsService } from "./raw-materials.service";
import { RawMaterialsRepository } from "./raw-materials.repository";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
@Module({
  imports: [UsersModule, PrismaModule, AuditModule],
  controllers: [RawMaterialsController],
  providers: [RawMaterialsService, RawMaterialsRepository],
  exports: [RawMaterialsService, RawMaterialsRepository],
})
export class RawMaterialsModule {}
