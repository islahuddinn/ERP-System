import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  Min,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class BulkAdjustmentItemDto {
  @ApiProperty({ example: "uuid-of-product", description: "Product ID" })
  @IsString()
  @IsString()
  productId: string;

  @ApiProperty({ example: "uuid-of-location", description: "Location ID" })
  @IsString()
  @IsString()
  locationId: string;

  @ApiProperty({
    example: "ADJUSTMENT",
    enum: ["RECEIPT", "ISSUE", "ADJUSTMENT"],
    description:
      "Transaction type: RECEIPT (add), ISSUE (subtract), ADJUSTMENT (set exact quantity)",
  })
  @IsEnum(["RECEIPT", "ISSUE", "ADJUSTMENT"])
  type: "RECEIPT" | "ISSUE" | "ADJUSTMENT";

  @ApiProperty({
    example: 10,
    description:
      "Quantity to adjust (for ADJUSTMENT type, this is the exact quantity to set)",
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: "Quantity must be 0 or greater" })
  quantity: number;

  @ApiProperty({ example: "Bulk stock adjustment", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class BulkAdjustmentDto {
  @ApiProperty({
    type: [BulkAdjustmentItemDto],
    description: "Array of stock adjustments to process",
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one adjustment is required" })
  @ArrayMaxSize(100, { message: "Maximum 100 adjustments allowed per request" })
  @ValidateNested({ each: true })
  @Type(() => BulkAdjustmentItemDto)
  adjustments: BulkAdjustmentItemDto[];

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
    example: "BULK-ADJ-001",
    required: false,
    description:
      "Bulk operation reference number (auto-generated if not provided)",
  })
  @IsOptional()
  @IsString()
  bulkReferenceNo?: string;
}
