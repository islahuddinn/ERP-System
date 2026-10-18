import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { WasteType, WasteItemType, WasteStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class QueryWasteManagementDto extends PaginationDto {
  @ApiPropertyOptional({ enum: WasteType })
  @IsOptional()
  @IsEnum(WasteType)
  wasteType?: WasteType;

  @ApiPropertyOptional({ enum: WasteItemType })
  @IsOptional()
  @IsEnum(WasteItemType)
  itemType?: WasteItemType;

  @ApiPropertyOptional({ enum: WasteStatus })
  @IsOptional()
  @IsEnum(WasteStatus)
  status?: WasteStatus;

  @ApiPropertyOptional({ description: "Filter by product ID" })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by raw material ID" })
  @IsOptional()
  @IsString()
  rawMaterialId?: string;

  @ApiPropertyOptional({ description: "Filter by site ID" })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: "Filter records created on or after this date" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Filter records created on or before this date" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
