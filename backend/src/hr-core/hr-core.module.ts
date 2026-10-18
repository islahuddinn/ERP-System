import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { GradeService } from "./services/grade.service";
import { OrgUnitService } from "./services/org-unit.service";
import { GradeController } from "./controllers/grade.controller";
import { OrgUnitController } from "./controllers/org-unit.controller";

@Module({
  imports: [UsersModule],
  providers: [GradeService, OrgUnitService],
  controllers: [GradeController, OrgUnitController],
  exports: [GradeService, OrgUnitService],
})
export class HrCoreModule {}
