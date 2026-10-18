import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { PayrollController } from './payroll.controller';
import { PayrollRepository } from './payroll.repository';
import { HolidayModule } from '../holiday/holiday.module';
import { LeaveRequestModule } from '../leave-request/leave-request.module';
import { LoanRequestModule } from '../loan-request/loan-request.module';
import { HrSettingsModule } from '../hr-settings/hr-settings.module';
import { UsersModule } from 'src/users/users.module';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    HolidayModule,
    LeaveRequestModule,
    LoanRequestModule,
    HrSettingsModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService, PayrollRepository],
  exports: [PayrollService, PayrollRepository],
})
export class PayrollModule {}
