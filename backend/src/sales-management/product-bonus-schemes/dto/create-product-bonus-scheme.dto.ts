import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { ProductBonusSchemeStatus, ProductBonusSchemeType } from "@prisma/tenant-client";

export class CreateProductBonusSchemeDto {
  @ApiProperty({ description: "Unique short code for the scheme" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) => value?.trim())
  code: string;

  @ApiProperty({ description: "Display name for the scheme" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Optional description of the scheme" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  description?: string;

  @ApiProperty({ description: "Product bonus group this scheme applies to" })
  @IsUUID()
  productBonusGroupId: string;

  @ApiPropertyOptional({
    enum: ProductBonusSchemeType,
    default: ProductBonusSchemeType.QTY_BONUS,
    description: "QTY_BONUS — buy minPurchaseQty from the group, get bonusQty free",
  })
  @IsOptional()
  @IsEnum(ProductBonusSchemeType)
  type?: ProductBonusSchemeType;

  @ApiProperty({ example: 10, description: "Minimum purchase quantity to qualify" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  minPurchaseQty: number;

  @ApiProperty({ example: 1, description: "Bonus quantity granted when threshold is met" })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  bonusQty: number;

  @ApiProperty({ example: "2026-01-01", description: "Scheme start date (ISO date)" })
  @IsDateString()
  validFrom: string;

  @ApiPropertyOptional({ example: "2026-12-31", description: "Optional end date (ISO date)" })
  @IsOptional()
  @ValidateIf((dto) => dto.validTo !== undefined && dto.validTo !== null && dto.validTo !== "")
  @IsDateString()
  validTo?: string;

  @ApiPropertyOptional({ enum: ProductBonusSchemeStatus, default: ProductBonusSchemeStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductBonusSchemeStatus)
  status?: ProductBonusSchemeStatus;
}
