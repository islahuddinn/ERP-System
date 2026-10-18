import { Module } from "@nestjs/common";
import { ReorderService } from "./reorder.service";
import { ReorderController } from "./reorder.controller";
import { ReorderRepository } from "./reorder.repository";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [UsersModule],
  providers: [ReorderService, ReorderRepository],
  controllers: [ReorderController],
  exports: [ReorderService],
})
export class ReorderModule {}
