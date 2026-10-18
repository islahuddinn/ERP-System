import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { CustomerLedgerAdjustmentType } from "@prisma/tenant-client";

export class CreateCustomerLedgerAdjustmentDto {
  @ApiProperty({ description: "Shop receiving the credit or debit note" })
  @IsUUID()
  customerId: string;

  @ApiProperty({
    enum: CustomerLedgerAdjustmentType,
    description: "CREDIT_NOTE reduces what the shop owes; DEBIT_NOTE increases it",
  })
  @IsEnum(CustomerLedgerAdjustmentType)
  type: CustomerLedgerAdjustmentType;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: "Goodwill discount after damaged delivery" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
