import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsArray,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";

export enum PlantStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  MAINTENANCE = "MAINTENANCE",
  UNDER_CONSTRUCTION = "UNDER_CONSTRUCTION",
  CLOSED = "CLOSED",
}

export enum PlantType {
  MANUFACTURING = "MANUFACTURING",
  ASSEMBLY = "ASSEMBLY",
  PACKAGING = "PACKAGING",
  WAREHOUSE = "WAREHOUSE",
  QUALITY_CONTROL = "QUALITY_CONTROL",
  RESEARCH_DEVELOPMENT = "RESEARCH_DEVELOPMENT",
  ADMINISTRATION = "ADMINISTRATION",
  MIXED = "MIXED",
}

export enum PlantCapacity {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  LARGE = "LARGE",
  EXTRA_LARGE = "EXTRA_LARGE",
}

export class CreatePlantDto {
  @ApiProperty({ example: "Main Manufacturing Plant" })
  @IsString()
  name: string;

  @ApiProperty({ example: "MP-001" })
  @IsString()
  code: string;

  @ApiProperty({ example: "Primary manufacturing facility", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlantType })
  @IsEnum(PlantType)
  plantType: PlantType;

  @ApiProperty({ enum: PlantCapacity })
  @IsEnum(PlantCapacity)
  capacity: PlantCapacity;

  @ApiProperty({ example: "123 Factory Street" })
  @IsString()
  address: string;

  @ApiProperty({ example: "555-123-4567", required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: "plant.manager@company.com", required: false })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ example: "John Doe", required: false })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  locationId: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "9:00 AM - 5:00 PM", required: false })
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: "Additional plant information", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 5000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  productionCapacity?: number;

  @ApiProperty({ example: ["ISO 9001", "ISO 14001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: ["Safety", "Quality", "Production"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];
}

export class UpdatePlantDto {
  @ApiProperty({ example: "Updated plant name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: "Updated description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PlantStatus })
  @IsOptional()
  @IsEnum(PlantStatus)
  status?: PlantStatus;

  @ApiProperty({ enum: PlantType })
  @IsOptional()
  @IsEnum(PlantType)
  plantType?: PlantType;

  @ApiProperty({ enum: PlantCapacity })
  @IsOptional()
  @IsEnum(PlantCapacity)
  capacity?: PlantCapacity;

  @ApiProperty({ example: "Updated address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: "555-123-4567" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ example: "plant.manager@company.com" })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ example: "John Doe" })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "9:00 AM - 5:00 PM" })
  @IsOptional()
  @IsString()
  operatingHours?: string;

  @ApiProperty({ example: "Updated notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ example: 6000 })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === "" ? undefined : value))
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @ApiProperty({ example: 150 })
  @IsOptional()
  @Transform(({ value }) => (value === null || value === "" ? undefined : value))
  @IsNumber()
  @Min(0)
  productionCapacity?: number;

  @ApiProperty({ example: ["ISO 9001", "ISO 14001", "OHSAS 18001"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: ["Safety", "Quality", "Production", "Maintenance"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departments?: string[];
}

export class PlantQueryDto {
  @ApiProperty({ example: "ACTIVE", required: false })
  @IsOptional()
  @IsEnum(PlantStatus)
  status?: PlantStatus;

  @ApiProperty({ example: "MANUFACTURING", required: false })
  @IsOptional()
  @IsEnum(PlantType)
  plantType?: PlantType;

  @ApiProperty({ example: "MEDIUM", required: false })
  @IsOptional()
  @IsEnum(PlantCapacity)
  capacity?: PlantCapacity;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "Plant name or code", required: false })
  @IsOptional()
  @IsString()
  search?: string;

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

export class PlantStatsQueryDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    required: false,
  })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiProperty({ example: "2024", required: false })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiProperty({ example: "01", required: false })
  @IsOptional()
  @IsString()
  month?: string;
}
