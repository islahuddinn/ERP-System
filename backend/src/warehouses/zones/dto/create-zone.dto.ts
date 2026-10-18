import { IsString, IsEnum, IsOptional, IsNumber, IsBoolean, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ZoneType } from "@prisma/tenant-client";

export class CreateZoneDto {
  @ApiProperty({ description: "Zone name", example: "Raw Materials Zone A" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Zone code (unique within warehouse)",
    example: "ZONE-A",
  })
  @IsString()
  code: string;

  @ApiProperty({
    enum: ZoneType,
    description: "Type of zone",
    example: ZoneType.RAW_MATERIALS,
  })
  @IsEnum(ZoneType)
  zoneType: ZoneType;

  @ApiProperty({ description: "Total capacity", example: 500 })
  @IsNumber()
  @Min(0)
  totalCapacity: number;

  @ApiPropertyOptional({ description: "Zone description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Temperature in Celsius" })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ description: "Humidity percentage" })
  @IsOptional()
  @IsNumber()
  humidity?: number;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Is zone active", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
