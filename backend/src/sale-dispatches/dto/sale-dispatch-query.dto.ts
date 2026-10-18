import { IsOptional, IsString, IsEnum, IsDateString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { SaleDispatchStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SaleDispatchQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by sale ID" })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiPropertyOptional({ description: "Filter by site ID" })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ enum: SaleDispatchStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(SaleDispatchStatus)
  status?: SaleDispatchStatus;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
