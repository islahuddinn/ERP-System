import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersModule } from "../../users/users.module";
import { JournalModule } from "../journal/journal.module";
import { FixedAssetController } from "./controllers/fixed-asset.controller";
import { FixedAssetService } from "./services/fixed-asset.service";
import { DepreciationService } from "./services/depreciation.service";
import { FixedAssetRepository } from "./repositories/fixed-asset.repository";
import { DepreciationRepository } from "./repositories/depreciation.repository";

@Module({
  imports: [PrismaModule, UsersModule, JournalModule],
  controllers: [FixedAssetController],
  providers: [
    FixedAssetService,
    DepreciationService,
    FixedAssetRepository,
    DepreciationRepository,
  ],
  exports: [FixedAssetService, DepreciationService],
})
export class AssetsModule {}

