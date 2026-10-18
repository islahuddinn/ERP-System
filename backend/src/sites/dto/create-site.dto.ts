import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  Max,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { CapacityUnit } from "@prisma/tenant-client";
import { SiteType } from "../enums/site-type.enum";
import { SiteCategory } from "../enums/site-category.enum";
import { SiteStatus } from "../enums/site-status.enum";

export class CreateSiteDto {
  @ApiProperty({ example: "Main Warehouse" })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "WH-001" })
  @Transform(({ value }) => value?.trim().toUpperCase())
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ enum: SiteType, example: SiteType.WAREHOUSE })
  @IsEnum(SiteType)
  type: SiteType;

  @ApiPropertyOptional({
    enum: SiteCategory,
    default: SiteCategory.GENERAL,
    description: "What category of goods this site holds (e.g. RAW_MATERIAL, FINISHED_GOODS)",
    example: SiteCategory.RAW_MATERIAL,
  })
  @IsOptional()
  @IsEnum(SiteCategory)
  category?: SiteCategory;

  @ApiPropertyOptional({
    default: "8afe8928-e559-4b39-b966-f33b721dbe3c",
    description: "Parent site ID for hierarchy nesting",
  })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({
    default: "8afe8928-e559-4b39-b966-f33b721dbe3c",
    description: "FK to Location (physical address)",
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    default: "8afe8928-e559-4b39-b966-f33b721dbe3c",
    description: "Manager user ID responsible for this site",
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ description: "Total storage capacity", example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCapacity?: number;

  @ApiPropertyOptional({
    enum: CapacityUnit,
    description: "Unit for capacity measurement",
    example: CapacityUnit.CUBIC_METER,
  })
  @IsOptional()
  @IsEnum(CapacityUnit)
  capacityUnit?: CapacityUnit;

  @ApiPropertyOptional({ description: "Current temperature in °C", example: 4 })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: "Current humidity percentage", example: 65 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;

  @ApiPropertyOptional({ example: "Cold storage unit for perishables" })
  @IsOptional()
  // Preserve an explicit null so a cleared Description persists as empty on
  // update instead of being dropped (which makes the old value reappear) (#18).
  @Transform(({ value }) => (value === null ? null : value?.trim() || undefined))
  @ValidateIf((_o, value) => value !== null)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ enum: SiteStatus, default: SiteStatus.ACTIVE })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;

  @ApiPropertyOptional({ example: { zone: "A", capacity: 5000 } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
