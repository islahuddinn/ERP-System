import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsArray,
  IsEnum,
  Min,
  ValidateNested,
  IsUrl,
  ValidateIf,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ProductType } from "../utils/enums";

/** Trim leading/trailing whitespace from string inputs before validation. */
const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

export class ProductAttributeDto {
  @ApiProperty({ example: "Color" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "Blue" })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ example: "cm" })
  @IsOptional()
  @IsString()
  unit?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: "Blue Glass 500ml" })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  name: string;

  @ApiProperty({ example: "BG-500-BLU", description: "Unique internal product code" })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: "Code is required" })
  code: string;

  @ApiPropertyOptional({ example: "8901234567890" })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ example: "Borosilicate blue glass, 500ml capacity" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.FINISHED_GOOD })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiProperty({ example: "e908e33f-f23a-438f-916d-eded9e8af091" })
  @IsString()
  @IsNotEmpty()
  uomId: string;

  @ApiPropertyOptional({ example: "9e56e8c1-2b1a-4b3a-9c1a-1f2b3c4d5e6f" })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ example: "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d" })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ example: "6f5e4d3c-2b1a-4f3e-8d7c-6b5a4938271f" })
  @IsOptional()
  @IsString()
  productGroupId?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentStock?: number;

  // Nullable so a cleared value on edit persists as null (shows EMPTY on reopen)
  // rather than snapping back to 0 — #5. When provided it must be >= 0.
  @ApiPropertyOptional({ example: 10, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number | null;

  @ApiPropertyOptional({ example: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxStock?: number | null;

  // Required and must be > 0 — an empty/zero reorder level is rejected (#7, #10).
  @ApiProperty({ example: 20 })
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: "Reorder level must be greater than 0" })
  reorderLevel: number;

  // Selling price is optional but, when provided, must be > 0 — #9.
  @ApiPropertyOptional({ example: 250.0, description: "Base selling price", nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: "Selling price must be greater than 0" })
  sellingPrice?: number | null;

  @ApiPropertyOptional({ example: ["https://cdn.example.com/blue-glass.jpg"] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true, message: "Each image must be a valid URL" })
  images?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    type: [ProductAttributeDto],
    description: "Descriptive attributes: color, size, material, dimensions, etc.",
    example: [
      { name: "Color", value: "Blue" },
      { name: "Capacity", value: "500", unit: "ml" },
      { name: "Material", value: "Borosilicate Glass" },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];
}
