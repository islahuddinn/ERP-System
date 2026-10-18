import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { DiscountType, ItemType } from "@prisma/tenant-client";

class CartItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ enum: ItemType })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemDiscountAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  itemTaxAmount?: number;
}

export class HoldInvoiceDto {
  @ApiProperty({ example: "uuid-of-location", description: "Location ID" })
  @IsString()
  locationId: string;

  @ApiProperty({
    required: false,
    example: "uuid-of-customer",
    description: "Customer ID",
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    required: false,
    example: "Customer Order #123",
    description: "Optional name/note for the held invoice",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ type: [CartItemDto], description: "Cart items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @ApiProperty({ description: "Subtotal" })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty({ required: false, description: "Tax rate", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiProperty({ required: false, description: "Tax amount", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxAmount?: number;

  @ApiProperty({
    required: false,
    enum: DiscountType,
    description: "Discount type",
  })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @ApiProperty({ required: false, description: "Discount value" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiProperty({ required: false, description: "Discount amount", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiProperty({ description: "Total amount" })
  @IsNumber()
  @Min(0)
  totalAmount: number;

  @ApiProperty({ required: false, description: "Bilty address" })
  @IsOptional()
  @IsString()
  biltyAddress?: string;

  @ApiProperty({ required: false, description: "Bilty contact" })
  @IsOptional()
  @IsString()
  biltyContact?: string;

  @ApiProperty({ required: false, description: "Labour expense" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  labourExpense?: number;

  @ApiProperty({ required: false, description: "Freight charges" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freightCharges?: number;

  @ApiProperty({ required: false, description: "Notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RestoreHeldInvoiceDto {
  @ApiProperty({
    example: "uuid-of-held-invoice",
    description: "Held Invoice ID",
  })
  @IsString()
  heldInvoiceId: string;
}
