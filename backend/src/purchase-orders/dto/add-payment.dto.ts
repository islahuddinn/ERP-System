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

export class AddPaymentDto {
  @ApiProperty({ example: 5000, description: "Amount being paid in this transaction" })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: "CASH" })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: "TXN-20260601-001",
    description: "Bank TXN ID or cheque number — required for non-cash payments",
  })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({
    example: "uuid",
    description: "Supplier bank account ID — only valid when the PO has a linked supplier",
  })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiPropertyOptional({ example: "Partial payment for June batch" })
  @IsOptional()
  @IsString()
  notes?: string;
}
