import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsBoolean,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class ReceivedItemDto {
  @ApiProperty({ example: "uuid-of-purchase-item" })
  @IsString()
  itemId: string;

  @ApiProperty({ example: 10, description: "Quantity accepted into stock" })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  acceptedQuantity: number;

  @ApiProperty({
    example: 2,
    required: false,
    description: "Quantity rejected (damaged/wrong/excess/short)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @ApiProperty({
    example: "DAMAGED",
    required: false,
    enum: ["DAMAGED", "WRONG_ITEM", "EXCESS", "SHORT", "OTHER"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["DAMAGED", "WRONG_ITEM", "EXCESS", "SHORT", "OTHER"])
  reason?: "DAMAGED" | "WRONG_ITEM" | "EXCESS" | "SHORT" | "OTHER";

  @ApiProperty({ example: "Good condition", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;

  // Backward compatibility with older clients (will be ignored if acceptedQuantity provided)
  @ApiProperty({
    example: "10",
    required: false,
    description: "[Deprecated] Legacy quantity field",
  })
  @IsOptional()
  @IsString()
  receivedQuantity?: string;
}

export class MarkReceivedDto {
  @ApiProperty({
    type: [ReceivedItemDto],
    description: "Items received with quantities",
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceivedItemDto)
  receivedItems?: ReceivedItemDto[];

  @ApiProperty({
    example: "2025-11-26T10:00:00.000Z",
    required: false,
    description: "Actual delivery/receipt date",
  })
  @IsOptional()
  @IsString()
  receivedDate?: string;

  @ApiProperty({
    example: "2025-11-30",
    required: false,
    description: "Next expected date if partially received",
  })
  @IsOptional()
  @IsString()
  nextExpectedDate?: string;

  @ApiProperty({
    example: false,
    required: false,
    description: "Allow receiving more than ordered",
  })
  @IsOptional()
  @IsBoolean()
  allowOverReceive?: boolean;

  @ApiProperty({
    example: "All items received in good condition",
    required: false,
  })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({
    example: "uuid-of-warehouse",
    description: "Warehouse ID for stock entry (Phase 4) - REQUIRED",
  })
  @IsString()
  @IsString()
  warehouseId: string;

  @ApiProperty({
    example: "uuid-of-zone",
    required: false,
    description: "Zone ID for stock entry (Phase 4) - Optional but recommended",
  })
  @IsOptional()
  @IsString()
  @IsString()
  zoneId?: string;

  @ApiProperty({
    example: "BATCH-2025-001",
    required: false,
    description: "Batch number for stock entry (Phase 4)",
  })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiProperty({
    example: "2025-12-31",
    required: false,
    description: "Expiry date for batch (Phase 4)",
  })
  @IsOptional()
  @IsString()
  expiryDate?: string;

  @ApiProperty({
    example: "2025-01-01",
    required: false,
    description: "Manufacturing date for batch (Phase 4)",
  })
  @IsOptional()
  @IsString()
  manufacturingDate?: string;
}
