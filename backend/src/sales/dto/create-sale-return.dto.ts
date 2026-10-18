import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsEnum,
  IsDateString,
  ArrayMinSize,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod } from "@prisma/tenant-client";

export class ReturnItemDto {
  @ApiProperty({ example: "sale-item-uuid" })
  @IsString()
  saleItemId: string;

  @ApiProperty({ example: 10, description: "Quantity to return" })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ example: "Damaged in transit" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateCustomerSaleReturnDto {
  @ApiProperty({ example: "Damaged goods returned by customer" })
  @IsString()
  reason: string;

  @ApiProperty({ example: "CASH", enum: PaymentMethod, description: "How refund will be paid" })
  @IsEnum(PaymentMethod)
  refundMethod: PaymentMethod;

  @ApiPropertyOptional({ example: "2026-06-17" })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({ example: "Customer confirmed delivery before returning" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];
}
