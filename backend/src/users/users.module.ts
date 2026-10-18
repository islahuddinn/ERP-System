import { forwardRef, Module } from "@nestjs/common";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import { PermissionsSeedService } from "./permissions/permissions-seed.service";
import { PermissionsService } from "./permissions/permissions.service";
import { PermissionsController } from "./permissions/permissions.controller";
import { PermissionsGuard } from "./guards/permissions.guard";
import { UsersRepository } from "./users.repository";
import { AuditModule } from "../audit/audit.module";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [forwardRef(() => AuditModule), CommonServicesModule],
  controllers: [UsersController, PermissionsController],
  providers: [UsersService, PermissionsSeedService, PermissionsService, PermissionsGuard, UsersRepository],
  exports: [UsersService, PermissionsSeedService, PermissionsService, PermissionsGuard],
})
export class UsersModule {}
