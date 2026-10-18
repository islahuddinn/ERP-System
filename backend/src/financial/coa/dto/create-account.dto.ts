import { IsString, IsEnum, IsOptional, IsNotEmpty, IsBoolean } from "class-validator";
import { AccountType, NormalBalance } from "@prisma/tenant-client";

export class CreateAccountDto {
  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @IsString()
  @IsNotEmpty()
  accountName: string;

  @IsEnum(AccountType)
  accountType: AccountType;

  @IsEnum(NormalBalance)
  normalBalance: NormalBalance;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
