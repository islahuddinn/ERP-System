import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
  ValidateIf,
} from "class-validator";
import { WasteType, WasteItemType } from "@prisma/tenant-client";

export class CreateWasteManagementDto {
  @ApiPropertyOptional({ description: "Auto-generated if not provided" })
  @IsOptional()
  @IsString()
  wasteNumber?: string;

  @ApiProperty({ enum: WasteType, description: "Why the waste occurred" })
  @IsEnum(WasteType)
  wasteType: WasteType;

  @ApiProperty({ enum: WasteItemType, description: "What was wasted" })
  @IsEnum(WasteItemType)
  itemType: WasteItemType;

  @ApiPropertyOptional({ description: "Required when itemType = PRODUCT" })
  @ValidateIf((dto: CreateWasteManagementDto) => dto.itemType === WasteItemType.PRODUCT)
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: "Required when itemType = RAW_MATERIAL" })
  @ValidateIf((dto: CreateWasteManagementDto) => dto.itemType === WasteItemType.RAW_MATERIAL)
  @IsString()
  rawMaterialId?: string;

  @ApiProperty({ minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: "Auto-calculated from item cost if not provided" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiProperty({ description: "Why the item was wasted" })
  @IsString()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;

  @ApiPropertyOptional({ description: "Site where the waste was recorded" })
  @IsOptional()
  @IsString()
  siteId?: string;
}
