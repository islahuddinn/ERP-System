import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsEnum, IsOptional, IsString, IsDateString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/tenant-client";

export class RecordPaymentDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: "CASH", enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({ example: "CHQ-2026-001" })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: "2026-06-17" })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: "Partial payment received" })
  @IsOptional()
  @IsString()
  notes?: string;
}
