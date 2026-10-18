import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Matches,
  IsPositive,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  Min,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { ReceivingType } from "@prisma/tenant-client";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export class GrnItemBatchDto {
  @ApiProperty({ example: "7bc71201-1b8f-4954-95f0-a277e6ab3ab5" })
  @IsString()
  siteId: string;

  @ApiProperty({ example: 50 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "quantity must be greater than 0" })
  quantity: number;

  @ApiPropertyOptional({ example: "2024-01-10" })
  @IsOptional()
  @Matches(ISO_DATE, { message: "manufacturingDate must be in YYYY-MM-DD format" })
  manufacturingDate?: string;

  @ApiPropertyOptional({ example: "2024-07-10" })
  @IsOptional()
  @Matches(ISO_DATE, { message: "expiryDate must be in YYYY-MM-DD format" })
  expiryDate?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: "unitCost cannot be negative" })
  unitCost?: number;

  @ApiPropertyOptional({ example: "Stored in cold storage" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateGrnItemDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  rawMaterialId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  uomId: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "expectedQuantity must be greater than 0" })
  expectedQuantity: number;

  @ApiProperty({ example: 98 })
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: "receivedQuantity must be greater than 0" })
  receivedQuantity: number;

  @ApiProperty({ example: "Specific requirements" })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiProperty({ example: "Additional receiving notes" })
  @IsOptional()
  @IsString()
  receivingNotes?: string;

  @ApiProperty({
    type: [GrnItemBatchDto],
    description:
      "Batch allocations this item's received quantity is split into. The sum of quantities must equal receivedQuantity.",
  })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one batch allocation is required" })
  @ValidateNested({ each: true })
  @Type(() => GrnItemBatchDto)
  batches: GrnItemBatchDto[];
}

export class CreateGrnDto {
  @ApiPropertyOptional({ example: "GRN-2024-001" })
  @IsOptional()
  @IsString()
  receivingNumber?: string;

  @ApiProperty({ enum: ReceivingType })
  @IsEnum(ReceivingType)
  receivingType: ReceivingType;

  @ApiProperty({ example: "2024-01-15T09:00:00Z" })
  @Matches(ISO_DATETIME, {
    message: "receivedDate must be a valid ISO date (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)",
  })
  receivedDate: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsNotEmpty()
  @IsString()
  purchaseOrderId: string;

  @ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  materialTransferId?: string;

  @ApiPropertyOptional({ example: "19e3d614-0426-4936-a987-49292961f765" })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: "Delivery vehicle details" })
  @IsOptional()
  @IsString()
  vehicleDetails?: string;

  @ApiPropertyOptional({ example: "DRN123456" })
  @IsOptional()
  @IsString()
  deliveryNoteNumber?: string;

  @ApiProperty({ type: [CreateGrnItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "GRN must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CreateGrnItemDto)
  items: CreateGrnItemDto[];
}
