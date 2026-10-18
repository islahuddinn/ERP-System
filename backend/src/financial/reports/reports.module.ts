import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { UsersModule } from '../../users/users.module';
import { GlPostingModule } from '../gl-posting/gl-posting.module';

@Module({
  imports: [PrismaModule, UsersModule, GlPostingModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
