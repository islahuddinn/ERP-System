import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsEnum, Min } from "class-validator";
import { RefundType, PaymentMethod } from "@prisma/tenant-client";

export class RefundSaleDto {
  @ApiProperty({
    example: "FULL",
    enum: RefundType,
    description: "Type of refund",
  })
  @IsEnum(RefundType)
  refundType: RefundType;

  @ApiProperty({
    example: 50.0,
    description: "Refund amount (required for PARTIAL refund)",
    required: false,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  refundAmount?: number;

  @ApiProperty({
    example: "CASH",
    enum: PaymentMethod,
    description: "How refund was given",
  })
  @IsEnum(PaymentMethod)
  refundMethod: PaymentMethod;

  @ApiProperty({
    example: "Product was defective",
    description: "Reason for refund",
  })
  @IsString()
  reason: string;

  @ApiProperty({
    example: "Refund processed in cash",
    description: "Additional notes",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
