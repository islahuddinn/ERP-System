import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod, PaymentStatus } from "@prisma/master-client";

export class UpdatePaymentDto {
  @ApiProperty({ example: 99.99, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ example: "USD", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: "2024-01-01T00:00:00Z", required: false })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiProperty({ enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ example: "TXN123456", required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiProperty({ example: "Payment notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
