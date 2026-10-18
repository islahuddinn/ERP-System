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
  Max,
  IsNotEmpty,
} from "class-validator";

import { Type, Transform } from "class-transformer";

export class CreatePurchaseItemDto {
  @ApiProperty({ example: "5939c357-3904-489e-8016-cc8e30eb89a5" })
  // IDs in this system are not guaranteed to be canonical UUIDs (some records
  // were imported/seeded with 32-char hex IDs), so validate as a non-empty
  // string and rely on the FK / validateRawMaterialIds check for existence.
  @IsString()
  @IsNotEmpty()
  rawMaterialId: string;

  @ApiProperty({ example: 100 })
  @IsNotEmpty({ message: "quantity is required" })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== "" ? Number(value) : value,
  )
  @IsNumber()
  @Min(0.01)
  @Max(999999)
  quantity: number;

  @ApiProperty({ example: 25.5 })
  @IsNotEmpty({ message: "unitPrice is required" })
  @Transform(({ value }) =>
    value !== undefined && value !== null && value !== "" ? Number(value) : value,
  )
  @IsNumber()
  @Min(0.01)
  unitPrice: number;

  @ApiPropertyOptional({ example: "Urgent batch" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({ example: "uuid-of-supplier" })
  @IsOptional()
  // Supplier IDs are not guaranteed to be canonical UUIDs; validate as a
  // non-empty string and rely on the FK constraint for existence.
  @IsString()
  @IsNotEmpty()
  supplierId?: string;

  @ApiPropertyOptional({ example: "REF-2026-001" })
  @IsOptional()
  @IsString()
  referenceNo?: string;

  @ApiPropertyOptional({ example: "2026-06-01" })
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional({ example: "2026-06-10" })
  @IsOptional()
  @IsDateString()
  expectedDate?: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ example: "Cotton for summer batch" })
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiProperty({ type: [CreatePurchaseItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "Purchase order must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({
    type: [String],
    description: "User IDs required to approve this purchase order before it can be confirmed",
    example: ["5939c357-3904-489e-8016-cc8e30eb89a5"],
  })
  @IsArray({ message: "At least one approver is required to create a purchase order" })
  @ArrayMinSize(1, { message: "At least one approver is required to create a purchase order" })
  @ArrayUnique({ message: "Approvers must not be duplicated" })
  @IsString({ each: true })
  approverIds: string[];
}
