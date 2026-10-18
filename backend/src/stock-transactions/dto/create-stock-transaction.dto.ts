import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateStockTransactionDto {
  @ApiProperty({ example: "uuid-of-product" })
  @IsString()
  @IsString()
  productId: string;

  @ApiProperty({
    example: "uuid-of-warehouse",
    description: "Warehouse for warehouse-specific transactions",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsString()
  warehouseId?: string;

  @ApiProperty({ example: "uuid-of-from-location", required: false })
  @IsOptional()
  @IsString()
  @IsString()
  fromLocationId?: string;

  @ApiProperty({ example: "uuid-of-to-location", required: false })
  @IsOptional()
  @IsString()
  @IsString()
  toLocationId?: string;

  @ApiProperty({
    example: "RECEIPT",
    enum: ["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT"],
  })
  @IsEnum(["RECEIPT", "ISSUE", "TRANSFER", "ADJUSTMENT"])
  type: "RECEIPT" | "ISSUE" | "TRANSFER" | "ADJUSTMENT";

  @ApiProperty({
    example: 10,
    description:
      "Quantity (0 is allowed for ADJUSTMENT type, must be > 0 for other types)",
  })
  @Type(() => Number)
  @IsNumber({}, { message: "Quantity must be a number" })
  quantity: number;

  @ApiProperty({ example: "REF-001", required: false })
  @IsOptional()
  @IsString()
  referenceNo?: string;

  @ApiProperty({ example: "Stock received from supplier", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    example: "uuid-of-sale",
    description: "Sale ID for POS transactions",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsString()
  saleId?: string;

  @ApiProperty({
    example: "uuid-of-sale-return",
    description: "Sale return ID for POS transactions",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsString()
  saleReturnId?: string;

  @ApiProperty({
    example: "uuid-of-purchase-order",
    description: "Link to a Purchase Order when receiving stock",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsString()
  purchaseOrderId?: string;
}
