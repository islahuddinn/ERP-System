import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";

export class CreateSalesZoneDto {
  @ApiProperty({ description: "Zone name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Region this zone belongs to" })
  @IsUUID()
  regionId: string;

  @ApiPropertyOptional({ enum: TerritoryStatus, default: TerritoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;
}
