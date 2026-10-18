import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { DiscountType } from "@prisma/tenant-client";
import { CreateSaleItemDto } from "./create-sale-item.dto";
import { CreatePaymentDto } from "./create-payment.dto";

export class CreateSaleDto {
  @ApiProperty({
    example: "uuid-of-customer",
    description: "Customer ID (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    example: "uuid-of-location",
    description:
      "Location where sale occurred (optional - stock checked from all DISPATCH warehouses)",
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: "uuid-of-warehouse",
    description:
      "Warehouse for stock sourcing (optional - if not provided, uses all DISPATCH warehouses)",
    required: false,
  })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ type: [CreateSaleItemDto], description: "Sale items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({
    type: [CreatePaymentDto],
    description: "Payments (optional for draft sales)",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments?: CreatePaymentDto[];

  @ApiProperty({
    example: 15.0,
    description: "Tax rate (%)",
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiProperty({
    example: "PERCENTAGE",
    enum: DiscountType,
    description: "Sale-level discount type",
    required: false,
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiProperty({
    example: 10.0,
    description: "Sale-level discount rate (%) or amount",
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountValue?: number;

  @ApiProperty({
    example: "Internal notes about the sale",
    description: "Internal notes",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    example: "Thank you for your purchase!",
    description: "Notes visible on receipt",
    required: false,
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiProperty({
    example: true,
    description: "Whether this is a credit sale (customer pays later)",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isCreditSale?: boolean;

  @ApiProperty({
    example: 100.0,
    description: "Amount paid by customer",
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amountPaid?: number;

  @ApiProperty({
    example: 150.0,
    description: "Total amount of the sale",
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalAmount?: number;
}
