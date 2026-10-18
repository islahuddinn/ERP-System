import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  Matches,
  Min,
  IsNotEmpty,
} from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateRawMaterialDto {
  @ApiProperty({ example: "Cotton Yarn", description: "Name of the raw material" })
  // Trim first so a whitespace-only name (e.g. "   ") fails @IsNotEmpty — #5.
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: "SUN-OIL",
    description:
      "Short unique code. Auto-formatted: uppercased, spaces → hyphens, non-alphanumeric stripped. e.g. 'sunflower oil' → 'SUNFLOWER-OIL'",
  })
  @Transform(({ value }) =>
    String(value)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "-")
      .replace(/[^A-Z0-9-]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, ""),
  )
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9][A-Z0-9-]{1,11}$/, {
    message: "Code must be 2–12 uppercase alphanumeric characters or hyphens",
  })
  code: string;

  @ApiProperty({ example: "High-quality cotton yarn used in fabric production", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: "8e000b71-e94d-497a-9247-eb170a41e826",
    description: "Unit of Measurement ID (e.g., kg, pcs, meters)",
  })
  @IsString()
  @IsNotEmpty()
  uomId: string;

  @ApiPropertyOptional({
    example: 50,
    description: "Reorder level — triggers reorder alert. Must be greater than 0.",
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: "Reorder level must be greater than 0" })
  reorderLevel?: number;

  @ApiPropertyOptional({
    example: 150.0,
    description: "Last purchase price per UOM unit",
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  lastPurchasePrice?: number;
}
