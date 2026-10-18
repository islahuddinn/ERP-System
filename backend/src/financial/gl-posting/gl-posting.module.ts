import { Global, Module } from "@nestjs/common";
import { UsersModule } from "../../users/users.module";
import { GlAccountResolver } from "./gl-account-resolver.service";
import { GlPostingRepository } from "./gl-posting.repository";
import { GlPostingService } from "./gl-posting.service";

@Global()
@Module({
  imports: [UsersModule],
  providers: [GlPostingRepository, GlAccountResolver, GlPostingService],
  exports: [GlPostingService, GlPostingRepository, GlAccountResolver],
})
export class GlPostingModule {}
