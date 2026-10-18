import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from "class-validator";
import { CashTransactionType } from "@prisma/tenant-client";

export class CreateCashInHandDto {
  @ApiProperty({ example: "2025-11-01", description: "Date for cash count" })
  @IsDateString()
  date: string;

  @ApiProperty({ example: "uuid-of-location", description: "Location ID" })
  @IsString()
  locationId: string;

  @ApiProperty({
    example: 1000.0,
    description: "Opening cash balance",
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingBalance?: number;
}
