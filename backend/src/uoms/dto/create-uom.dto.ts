import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, IsEnum } from "class-validator";
import { UomCategory } from "../utils/enums";

export class CreateUOMDto {
  @ApiProperty({ example: "Kilogram", description: "Display name" })
  @IsString()
  name: string;

  @ApiProperty({ example: "kg", description: "Short symbol shown in UI" })
  @IsString()
  symbol: string;

  @ApiProperty({ example: "KILOGRAM", description: "Stable code used in business logic — unique" })
  @IsString()
  code: string;

  @ApiProperty({ enum: UomCategory, example: UomCategory.WEIGHT })
  @IsEnum(UomCategory)
  category: UomCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
