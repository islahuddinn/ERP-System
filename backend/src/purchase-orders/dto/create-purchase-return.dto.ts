import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
  ValidateNested,
  Min,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class CreatePurchaseReturnItemDto {
  @ApiProperty({ example: "uuid-of-raw-material" })
  @IsString()
  @IsNotEmpty()
  rawMaterialId: string;

  @ApiProperty({
    example: "uuid-of-batch",
    description:
      "Batch to return from — quantity is deducted from batch.availableQuantity on completion",
  })
  @IsString()
  @IsNotEmpty()
  batchId: string;

  @ApiPropertyOptional({
    example: "uuid-of-grn-item",
    description: "GRN item this batch came from (for traceability)",
  })
  @IsOptional()
  @IsString()
  grnItemId?: string;

  @ApiPropertyOptional({
    example: "uuid-of-purchase-item",
    description: "PO line item for traceability",
  })
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @ApiProperty({ example: 5 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    example: 250.0,
    description: "Ignored — unit price is automatically taken from the batch's stored unitCost",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: "Defective batch" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreatePurchaseReturnDto {
  @ApiProperty({ example: "uuid-of-purchase-order" })
  @IsString()
  @IsNotEmpty()
  purchaseOrderId: string;

  @ApiPropertyOptional({ example: "uuid-of-grn" })
  @IsOptional()
  @IsString()
  grnId?: string;

  @ApiPropertyOptional({ example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiProperty({ example: "Defective raw material received" })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: "Batch number XYZ was entirely defective" })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [CreatePurchaseReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseReturnItemDto)
  items: CreatePurchaseReturnItemDto[];

  @ApiPropertyOptional({
    type: [String],
    description: "User IDs required to approve this return before it can be approved",
    example: ["5939c357-3904-489e-8016-cc8e30eb89a5"],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  approverIds?: string[];
}
