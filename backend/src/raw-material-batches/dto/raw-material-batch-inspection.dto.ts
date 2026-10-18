import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  IsDateString,
} from "class-validator";
import { InspectionType, QualityStatus } from "@prisma/tenant-client";

export class CreateRawMaterialBatchInspectionDto {
  @ApiProperty({ enum: InspectionType })
  @IsEnum(InspectionType)
  inspectionType: InspectionType;

  @ApiProperty({ enum: QualityStatus })
  @IsEnum(QualityStatus)
  qualityStatus: QualityStatus;

  @ApiPropertyOptional({ example: 450, description: "Quantity passed inspection" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedQuantity?: number;

  @ApiPropertyOptional({ example: 50, description: "Quantity rejected during inspection" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @ApiProperty({ example: "All parameters within acceptable range" })
  @IsString()
  results: string;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: "2026-06-10T00:00:00Z" })
  @IsOptional()
  @IsDateString()
  inspectedDate?: string;
}

export class UpdateRawMaterialBatchInspectionDto {
  @ApiPropertyOptional({ enum: QualityStatus })
  @IsOptional()
  @IsEnum(QualityStatus)
  qualityStatus?: QualityStatus;

  @ApiPropertyOptional({ example: 450 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedQuantity?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  results?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observations?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
