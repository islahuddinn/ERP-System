import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export enum BankTransactionTypeDto {
  DEPOSIT = "DEPOSIT",
  WITHDRAW = "WITHDRAW",
}

export class CreateBankTransactionDto {
  @ApiProperty({ description: "Bank account ID" })
  @IsString()
  @IsNotEmpty()
  bankAccountId: string;

  @ApiProperty({ description: "Transaction type", enum: BankTransactionTypeDto })
  @IsEnum(BankTransactionTypeDto)
  type: BankTransactionTypeDto;

  @ApiProperty({ description: "Amount" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    description:
      "Counterparty Chart of Account ID. Deposit credits this account; Withdraw debits this account.",
  })
  @IsString()
  @IsNotEmpty()
  counterpartyAccountId: string;

  @ApiProperty({
    description:
      "Optional Chart of Account ID for the bank (cash) side. If not provided, the system picks the first ASSET/CASH/BANK-like account.",
    required: false,
  })
  @IsString()
  @IsOptional()
  cashAccountId?: string;

  @ApiProperty({ description: "Description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Transaction date", required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;
}

