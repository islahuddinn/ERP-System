import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
} from "class-validator";
import { Transform } from "class-transformer";

export enum ProductionLineStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
  UNDER_REPAIR = "UNDER_REPAIR",
  DECOMMISSIONED = "DECOMMISSIONED",
}

export enum ProductionLineType {
  ASSEMBLY = "ASSEMBLY",
  PACKAGING = "PACKAGING",
  MANUFACTURING = "MANUFACTURING",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  TESTING = "TESTING",
  MIXED = "MIXED",
}

export enum ProductionLinePriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export class CreateProductionLineDto {
  @ApiProperty({ example: "Assembly Line A" })
  @IsString()
  name: string;

  @ApiProperty({ example: "AL-001" })
  @IsString()
  code: string;

  @ApiProperty({ example: "Primary assembly line for electronic components" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductionLineType })
  @IsEnum(ProductionLineType)
  lineType: ProductionLineType;

  @ApiProperty({ example: 1000 })
  @IsNumber()
  @Min(0)
  capacity: number;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  plantId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "Zone A, Area 1" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  location?: string;

  @ApiProperty({ example: "24/7 operation" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: "Additional line information" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: ["Safety", "Quality", "Production"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @ApiProperty({ example: ["ISO 9001", "ISO 14001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: ["Machine A", "Machine B", "Machine C"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];
}

export class UpdateProductionLineDto {
  @ApiProperty({ example: "Updated line name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ProductionLineStatus })
  @IsOptional()
  @IsEnum(ProductionLineStatus)
  status?: ProductionLineStatus;

  @ApiProperty({ enum: ProductionLineType })
  @IsOptional()
  @IsEnum(ProductionLineType)
  lineType?: ProductionLineType;

  @ApiProperty({ example: 1500 })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsNumber()
  @Min(0)
  capacity?: number;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "Updated location" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  location?: string;

  @ApiProperty({ example: "Updated operating hours" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: "Updated notes" })
  @IsOptional()
  @Transform(({ value }) =>
    value === null || value === "" ? undefined : value,
  )
  @IsString()
  notes?: string;

  @ApiProperty({ example: ["Safety", "Quality", "Production", "Maintenance"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];

  @ApiProperty({ example: ["ISO 9001", "ISO 14001", "OHSAS 18001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({
    example: ["Machine A", "Machine B", "Machine C", "Machine D"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];
}

export class ProductionLineQueryDto {
  @ApiProperty({ example: "ACTIVE", required: false })
  @IsOptional()
  @IsEnum(ProductionLineStatus)
  status?: ProductionLineStatus;

  @ApiProperty({ example: "ASSEMBLY", required: false })
  @IsOptional()
  @IsEnum(ProductionLineType)
  lineType?: ProductionLineType;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2024-12-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: "1", required: false })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiProperty({ example: "10", required: false })
  @IsOptional()
  @IsString()
  limit?: string;
}

export class ProductionLineStatsQueryDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  plantId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ example: "2024", required: false })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({ example: "01", required: false })
  @IsOptional()
  @IsString()
  month?: string;
}

export class UpdateProductionLineLoadDto {
  @ApiProperty({ example: 750 })
  @IsNumber()
  @Min(0)
  currentLoad: number;

  @ApiProperty({ example: "Current load update" })
  @IsOptional()
  @IsString()
  notes?: string;
}
