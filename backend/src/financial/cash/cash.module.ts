import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersModule } from "../../users/users.module";
import { JournalModule } from "../journal/journal.module";
import { BankAccountController } from "./controllers/bank-account.controller";
import { BankTransactionController } from "./controllers/bank-transaction.controller";
import { BankAccountService } from "./services/bank-account.service";
import { BankTransactionService } from "./services/bank-transaction.service";
import { BankAccountRepository } from "./repositories/bank-account.repository";
import { BankTransactionRepository } from "./repositories/bank-transaction.repository";

@Module({
  imports: [PrismaModule, UsersModule, JournalModule],
  controllers: [BankAccountController, BankTransactionController],
  providers: [
    BankAccountService,
    BankTransactionService,
    BankAccountRepository,
    BankTransactionRepository,
  ],
  exports: [BankAccountService, BankTransactionService],
})
export class CashModule {}

