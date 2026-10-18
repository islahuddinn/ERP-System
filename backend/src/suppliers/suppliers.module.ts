import { Module } from "@nestjs/common";
import { SuppliersController } from "./suppliers.controller";
import { SuppliersService } from "./suppliers.service";
import { SuppliersRepository } from "./suppliers.repository";
import { SupplierTransactionsController } from "./supplier-transactions.controller";
import { SupplierTransactionsService } from "./supplier-transactions.service";
import { SupplierTransactionsRepository } from "./supplier-transactions.repository";
import { SupplierLedgerController } from "./ledger.controller";
import { SupplierLedgerService } from "./ledger.service";
import { SupplierBankAccountsController } from "./supplier-bank-accounts.controller";
import { SupplierBankAccountsService } from "./supplier-bank-accounts.service";
import { SupplierBankAccountsRepository } from "./supplier-bank-accounts.repository";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [UsersModule, PrismaModule, AuditModule],
  // SupplierLedgerController MUST be registered before SuppliersController so that
  // the static route GET /suppliers/ledger-overview is matched before the param
  // route GET /suppliers/:id (otherwise "ledger-overview" is treated as a supplier id).
  controllers: [
    SupplierLedgerController,
    SuppliersController,
    SupplierTransactionsController,
    SupplierBankAccountsController,
  ],
  providers: [
    SuppliersService,
    SuppliersRepository,
    SupplierTransactionsService,
    SupplierTransactionsRepository,
    SupplierLedgerService,
    SupplierBankAccountsService,
    SupplierBankAccountsRepository,
  ],
  exports: [
    SuppliersService,
    SupplierLedgerService,
    SuppliersRepository,
    SupplierTransactionsRepository,
  ],
})
export class SuppliersModule {}
