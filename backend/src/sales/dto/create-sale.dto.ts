import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateCustomerSaleItemDto {
  @ApiProperty({ example: "product-uuid" })
  @IsString()
  productId: string;

  @ApiProperty({ example: 50, description: "Quantity to sell" })
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 1200, description: "Selling price per unit (can override batch price)" })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ example: 5, description: "Discount percentage applied to this item" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemDiscountPercentage?: number;

  @ApiPropertyOptional({ example: 50, description: "Fixed discount amount applied to this item" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemDiscountAmount?: number;

  @ApiPropertyOptional({ example: "Special batch for export" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCustomerSaleDto {
  @ApiPropertyOptional({ example: "customer-uuid" })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: "2026-06-17" })
  @IsOptional()
  @IsDateString()
  saleDate?: string;

  @ApiProperty({ type: [CreateCustomerSaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerSaleItemDto)
  items: CreateCustomerSaleItemDto[];

  @ApiPropertyOptional({
    example: 2,
    description: "Discount percentage applied to the overall sale total",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercentage?: number;

  @ApiPropertyOptional({
    example: 100,
    description: "Fixed discount amount applied to the overall sale total",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ example: 5, description: "Tax percentage applied after discounts" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxPercentage?: number;

  @ApiPropertyOptional({
    example: 50,
    description: "Fixed tax amount added on top of percentage tax",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiPropertyOptional({ example: "Deliver by end of week" })
  @IsOptional()
  @IsString()
  notes?: string;
}
