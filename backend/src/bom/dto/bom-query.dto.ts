import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { BOMStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { TransformBomStatus } from "../../common/utils/query-status-transform.util";

export class BomQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by the product this BOM produces" })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ enum: BOMStatus, description: "Filter by BOM lifecycle status" })
  @IsOptional()
  @TransformBomStatus()
  @IsEnum(BOMStatus)
  status?: BOMStatus;

  @ApiPropertyOptional({ example: "2026-01-01", description: "Filter BOMs created on/after this date" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31", description: "Filter BOMs created on/before this date" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
