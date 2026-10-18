import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { OrgUnitType } from "@prisma/tenant-client";

export class CreateOrgUnitDto {
  @ApiProperty({ description: "Org unit name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiProperty({ enum: OrgUnitType, description: "Org unit type" })
  @IsEnum(OrgUnitType)
  type: OrgUnitType;

  @ApiPropertyOptional({ description: "Parent org unit ID" })
  @IsOptional()
  @IsString()
  parentId?: string;
}
