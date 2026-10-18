import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
} from "class-validator";
import { InspectionType, QualityStatus } from "@prisma/tenant-client";

export class CreateQualityControlDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inspectionNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty({ enum: InspectionType })
  @IsEnum(InspectionType)
  inspectionType: InspectionType;

  @ApiProperty({ enum: QualityStatus, default: QualityStatus.PENDING })
  @IsEnum(QualityStatus)
  qualityStatus: QualityStatus;

  @ApiProperty()
  @IsString()
  results: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [String], default: [] })
  @IsArray()
  @IsString({ each: true })
  observations: string[];
}

export class UpdateQualityControlDto {
  @ApiProperty({ enum: InspectionType, required: false })
  @IsOptional()
  @IsEnum(InspectionType)
  inspectionType?: InspectionType;

  @ApiProperty({ enum: QualityStatus, required: false })
  @IsOptional()
  @IsEnum(QualityStatus)
  qualityStatus?: QualityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  results?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  observations?: string[];
}
