import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ProductBonusGroupStatus } from "@prisma/tenant-client";

export class CreateProductBonusGroupDto {
  @ApiProperty({ description: "Unique short code for the bonus group" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) => value?.trim())
  code: string;

  @ApiProperty({ description: "Display name for the bonus group" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Optional description of the group purpose" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  description?: string;

  @ApiPropertyOptional({ enum: ProductBonusGroupStatus, default: ProductBonusGroupStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductBonusGroupStatus)
  status?: ProductBonusGroupStatus;

  @ApiProperty({
    type: [String],
    description: "Product UUIDs included in this bonus group (at least one)",
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID("4", { each: true })
  productIds: string[];
}
