import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdatePurchaseReturnItemDto {
  @ApiPropertyOptional({
    example: "uuid-of-existing-item",
    description: "Omit to create a new item",
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ example: "uuid-of-raw-material" })
  @IsOptional()
  @IsString()
  rawMaterialId?: string;

  @ApiPropertyOptional({ example: "uuid-of-batch" })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional({ example: "uuid-of-grn-item" })
  @IsOptional()
  @IsString()
  grnItemId?: string;

  @ApiPropertyOptional({ example: "uuid-of-purchase-item" })
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  quantity?: number;

  @ApiPropertyOptional({
    example: 250.0,
    description: "Ignored — unit price is automatically taken from the batch's stored unitCost",
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ example: "Wrong spec" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdatePurchaseReturnDto {
  @ApiPropertyOptional({ example: "uuid-of-purchase-order" })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  // Optional FK that the client may clear — allow explicit null to unset it.
  @ApiPropertyOptional({ example: "uuid-of-grn", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  grnId?: string | null;

  @ApiPropertyOptional({ example: "2026-06-05" })
  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @ApiPropertyOptional({ example: "Wrong specifications" })
  @IsOptional()
  @IsString()
  reason?: string;

  // Optional free-text field the client may clear — allow explicit null/"" to persist the cleared value.
  @ApiPropertyOptional({ example: "Supplier agreed to take back full batch", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  remarks?: string | null;

  @ApiPropertyOptional({ type: [UpdatePurchaseReturnItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseReturnItemDto)
  items?: UpdatePurchaseReturnItemDto[];

  // Reassign the return's approvers (#7). Reconciled against existing approval rows.
  @ApiPropertyOptional({ type: [String], example: ["uuid-of-user"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverIds?: string[];
}
