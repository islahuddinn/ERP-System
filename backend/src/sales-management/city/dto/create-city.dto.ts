import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";

export class CreateCityDto {
  @ApiProperty({ description: "City name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Zone this city belongs to" })
  @IsUUID()
  zoneId: string;

  @ApiPropertyOptional({ enum: TerritoryStatus, default: TerritoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;
}
