import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsEmail,
  IsBoolean,
  Min,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { WarehouseType } from "@prisma/tenant-client";

export class CreateWarehouseDto {
  @ApiProperty({
    description: "Warehouse name",
    example: "Main Storage Warehouse",
  })
  @IsString()
  name: string;

  @ApiProperty({ description: "Unique warehouse code", example: "WH-001" })
  @IsString()
  code: string;

  @ApiProperty({
    enum: WarehouseType,
    description: "Type of warehouse",
    example: WarehouseType.STORAGE,
  })
  @IsEnum(WarehouseType)
  warehouseType: WarehouseType;

  @ApiProperty({ description: "Location ID where warehouse is located" })
  @IsString()
  locationId: string;

  @ApiPropertyOptional({ description: "Warehouse address" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: "Contact person name" })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ description: "Contact phone number" })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ description: "Contact email address" })
  @IsOptional()
  @ValidateIf((o) => o.contactEmail && o.contactEmail.trim() !== "")
  @IsEmail({}, { message: "contactEmail must be a valid email address" })
  contactEmail?: string;

  @ApiProperty({
    description: "Total capacity in cubic meters or units",
    example: 1000,
  })
  @IsNumber()
  @Min(0)
  totalCapacity: number;

  @ApiPropertyOptional({
    description: "Capacity unit",
    example: "CUBIC_METER",
    default: "CUBIC_METER",
  })
  @IsOptional()
  @IsString()
  capacityUnit?: string;

  @ApiPropertyOptional({ description: "Warehouse description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Manager user ID" })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ description: "Is warehouse active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
