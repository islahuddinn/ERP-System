import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";

export class CreateAreaDto {
  @ApiProperty({ description: "Area name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: "Branch this area belongs to" })
  @IsUUID()
  branchId: string;

  @ApiPropertyOptional({ enum: TerritoryStatus, default: TerritoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;
}
