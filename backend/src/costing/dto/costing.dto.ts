import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
} from "class-validator";

export enum CostPeriod {
  THIS_MONTH = "this_month",
  LAST_MONTH = "last_month",
  THIS_QUARTER = "this_quarter",
  THIS_YEAR = "this_year",
  CUSTOM = "custom",
}

export class CostDashboardQueryDto {
  @ApiPropertyOptional({ enum: CostPeriod, default: CostPeriod.THIS_MONTH })
  @IsOptional()
  @IsEnum(CostPeriod)
  period?: CostPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;
}

export class CostReportQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;
}

export class ProfitabilityQueryDto {
  @ApiPropertyOptional({ enum: CostPeriod, default: CostPeriod.THIS_MONTH })
  @IsOptional()
  @IsEnum(CostPeriod)
  period?: CostPeriod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  siteId?: string;
}
