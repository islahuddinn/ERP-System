import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateBomItemDto {
  @ApiProperty({ description: "Raw material ID" })
  @IsString()
  rawMaterialId: string;

  @ApiProperty({ description: "Unit of measure ID for this item" })
  @IsString()
  uomId: string;

  @ApiProperty({
    description: "Quantity of this raw material required per 1 finished unit",
    example: 2.5,
  })
  @IsNumber()
  @Min(0.0001)
  quantityPerUnit: number;

  @ApiPropertyOptional({
    description:
      "Extra percentage to consume to account for process loss (e.g. 2 = 2% more pulled from batches)",
    example: 2,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  wastagePercent?: number;

  @ApiPropertyOptional({ description: "Optional notes for this item" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateBomDto {
  @ApiProperty({ description: "ID of the finished product this BOM produces" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "Unique name for this BOM", example: "Local Chair Formula" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: "Optional description or notes about this BOM" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [CreateBomItemDto], description: "Raw material line items" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBomItemDto)
  items: CreateBomItemDto[];
}
