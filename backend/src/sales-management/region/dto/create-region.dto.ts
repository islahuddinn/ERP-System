import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";

export class CreateRegionDto {
  @ApiProperty({ description: "Region name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Country this region belongs to" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  countryName: string;

  @ApiPropertyOptional({ enum: TerritoryStatus, default: TerritoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;
}
