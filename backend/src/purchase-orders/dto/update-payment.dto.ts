import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod } from "@prisma/tenant-client";

export class UpdatePaymentDto {
  @ApiProperty({ example: 2500, description: "Revised payment amount for this transaction" })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentMethod, example: "BANK_TRANSFER" })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: "TXN-20260601-002" })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    example: "uuid",
    description: "Supplier bank account ID — only valid for BANK_TRANSFER or CHEQUE payments",
  })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ example: "Corrected payment amount" })
  @IsOptional()
  @IsString()
  notes?: string;
}
