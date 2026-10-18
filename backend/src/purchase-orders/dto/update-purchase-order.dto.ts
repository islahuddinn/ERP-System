import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsArray,
  ArrayMinSize,
  ArrayUnique,
  ValidateNested,
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { PartialType } from "@nestjs/swagger";
import { CreatePurchaseItemDto } from "./create-purchase-order.dto";

export class UpdatePurchaseItemDto extends PartialType(CreatePurchaseItemDto) {
  @ApiPropertyOptional({ example: "uuid-of-existing-item", description: "Provide to update, omit to create new" })
  @IsOptional()
  // Existing item IDs are not guaranteed to be canonical UUIDs; validate as a
  // non-empty string and let the update lookup enforce existence.
  @IsString()
  @IsNotEmpty()
  id?: string;
}

export class UpdatePurchaseOrderDto {
  @ApiPropertyOptional({ example: "uuid-of-supplier" })
  @IsOptional()
  // Supplier IDs are not guaranteed to be canonical UUIDs (QA #12: changing the
  // supplier to a record with a 32-char hex ID failed @IsUUID validation with a
  // 400). Validate as a non-empty string and rely on the FK for existence.
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

  @ApiPropertyOptional({ type: [UpdatePurchaseItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdatePurchaseItemDto)
  items?: UpdatePurchaseItemDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      "Replacement set of approver user IDs. When provided, the PO's approvers are reconciled to this exact set (added/removed). Omit to leave approvers unchanged.",
    example: ["5939c357-3904-489e-8016-cc8e30eb89a5"],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: "At least one approver is required" })
  @ArrayUnique({ message: "Approvers must not be duplicated" })
  // Approver IDs are validated for existence in the service (validateApproverIds);
  // accept non-empty strings here rather than @IsUUID so non-canonical IDs pass (QA #12).
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  approverIds?: string[];
}
