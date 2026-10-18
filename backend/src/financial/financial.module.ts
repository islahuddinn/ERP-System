import { Module } from '@nestjs/common';
import { CoaModule } from './coa/coa.module';
import { JournalModule } from './journal/journal.module';
import { ReportsModule } from './reports/reports.module';
import { ApModule } from './ap/ap.module';
import { ArModule } from './ar/ar.module';
import { CashModule } from './cash/cash.module';
import { AssetsModule } from './assets/assets.module';
import { BudgetingModule } from './budgeting/budgeting.module';
import { GlPostingModule } from './gl-posting/gl-posting.module';

@Module({
  imports: [
    CoaModule,
    JournalModule,
    ReportsModule,
    ApModule,
    ArModule,
    CashModule,
    AssetsModule,
    BudgetingModule,
    GlPostingModule,
  ],
  exports: [
    CoaModule,
    JournalModule,
    ReportsModule,
    ApModule,
    ArModule,
    CashModule,
    AssetsModule,
    BudgetingModule,
    GlPostingModule,
  ],
})
export class FinancialModule {}
