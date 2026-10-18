import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
} from "class-validator";

export class BatchItemDto {
  @ApiProperty({ example: "uuid-of-grn-item" })
  @IsString()
  @IsString()
  grnItemId: string;

  @ApiProperty({ example: "uuid-of-raw-material" })
  @IsString()
  @IsString()
  rawMaterialId: string;

  @ApiProperty({ example: "uuid-of-site" })
  @IsString()
  @IsString()
  siteId: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.001, { message: "Quantity must be greater than 0" })
  quantity: number;

  @ApiPropertyOptional({ example: "2026-09-01T00:00:00Z" })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ example: "2026-01-15T00:00:00Z" })
  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @ApiPropertyOptional({ example: 250.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: "Cold storage lot A" })
  @IsOptional()
  @IsString()
  notes?: string;
}
