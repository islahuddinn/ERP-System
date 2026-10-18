import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CashTransactionType } from "@prisma/tenant-client";

export class CreateCashTransactionDto {
  @ApiProperty({ example: "uuid-of-location", description: "Location ID" })
  @IsString()
  locationId: string;

  @ApiProperty({
    example: "CASH_SALE",
    enum: CashTransactionType,
    description: "Type of transaction",
  })
  @IsEnum(CashTransactionType)
  type: CashTransactionType;

  @ApiProperty({
    example: 150.0,
    description: "Transaction amount",
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    example: "Cash sale payment",
    description: "Transaction description",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: "SALE-001",
    description: "Reference number (e.g., Sale ID)",
    required: false,
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({
    example: "SALE",
    description: "Reference type",
    required: false,
  })
  @IsOptional()
  @IsString()
  referenceType?: string;

  @ApiProperty({
    example: "2025-11-01T10:00:00Z",
    description: "Transaction date",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;
}
