import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ProductBatchStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import {
  TransformOptionalBooleanQuery,
  TransformProductBatchStatus,
} from "../../../common/utils/query-status-transform.util";

export class QueryProductBatchDto extends PaginationDto {
  // product/site IDs are not guaranteed canonical UUIDs — validate as strings.
  @ApiPropertyOptional({ description: "Filter by product" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by current site" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  siteId?: string;

  @ApiPropertyOptional({ enum: ProductBatchStatus })
  @IsOptional()
  @TransformProductBatchStatus()
  @IsEnum(ProductBatchStatus)
  status?: ProductBatchStatus;

  @ApiPropertyOptional({
    description: "Filter by current stage name (e.g. 'Production', 'Packing')",
  })
  @IsOptional()
  @IsString()
  currentStage?: string;

  @ApiPropertyOptional({
    description: "Filter by whether the batch is a finished good (true) or still WIP (false)",
  })
  @IsOptional()
  @TransformOptionalBooleanQuery()
  @IsBoolean()
  isFinal?: boolean;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
