import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";
import { RawMaterialBatchStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class QueryRawMaterialBatchDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by raw material ID" })
  @IsOptional()
  @IsString()
  rawMaterialId?: string;

  @ApiPropertyOptional({ description: "Filter by site ID" })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ description: "Filter by GRN ID" })
  @IsOptional()
  @IsString()
  grnId?: string;

  @ApiPropertyOptional({ enum: RawMaterialBatchStatus })
  @IsOptional()
  @IsEnum(RawMaterialBatchStatus)
  status?: RawMaterialBatchStatus;

  @ApiPropertyOptional({ description: "Batches expiring within X days", minimum: 1, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  expiringDays?: number;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class FifoAllocationQueryDto {
  @ApiPropertyOptional({ description: "Quantity of raw material needed" })
  @IsOptional()
  @Type(() => Number)
  quantity?: number;
}

export class ConsumeBatchDto {
  @ApiProperty({ description: "Quantity to consume", minimum: 0.001 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiPropertyOptional({ example: "PRODUCTION_ORDER" })
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ example: "uuid-of-production-order" })
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  notes?: string;
}
