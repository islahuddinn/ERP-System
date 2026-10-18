import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class BulkTransferItemDto {
  @ApiProperty({ example: "uuid-of-product", description: "Product ID" })
  @IsString()
  @IsString()
  productId: string;

  @ApiProperty({
    example: "uuid-of-from-location",
    description: "Source location ID",
  })
  @IsString()
  @IsString()
  fromLocationId: string;

  @ApiProperty({
    example: "uuid-of-to-location",
    description: "Destination location ID",
  })
  @IsString()
  @IsString()
  toLocationId: string;

  @ApiProperty({ example: 10, description: "Quantity to transfer" })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: "Quantity must be greater than 0" })
  quantity: number;

  @ApiProperty({ example: "Bulk stock transfer", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkTransferDto {
  @ApiProperty({
    type: [BulkTransferItemDto],
    description: "Array of stock transfers to process",
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one transfer is required" })
  @ArrayMaxSize(100, { message: "Maximum 100 transfers allowed per request" })
  @ValidateNested({ each: true })
  @Type(() => BulkTransferItemDto)
  transfers: BulkTransferItemDto[];

  @ApiProperty({
    example: false,
    required: false,
    description:
      "If true, continue processing even if some items fail. If false, all-or-nothing transaction.",
  })
  @IsOptional()
  @IsBoolean()
  allowPartialSuccess?: boolean;

  @ApiProperty({
    example: "BULK-TRF-001",
    required: false,
    description:
      "Bulk operation reference number (auto-generated if not provided)",
  })
  @IsOptional()
  @IsString()
  bulkReferenceNo?: string;
}
