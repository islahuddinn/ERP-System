import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsEnum, IsOptional, IsString, IsDateString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/tenant-client";

export class UpdatePaymentDto {
  @ApiPropertyOptional({ example: 5000, description: "New payment amount — adjusts sale balance and customer ledger" })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional({ example: "CASH", enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: "CHQ-2026-001" })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: "2026-06-17" })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: "Cheque cleared" })
  @IsOptional()
  @IsString()
  notes?: string;
}
