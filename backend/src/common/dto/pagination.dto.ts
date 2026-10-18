import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export enum SortOrder {
  ASC = `ASC`,
  DESC = `DESC`,
}

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  page: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: SortOrder, default: "desc" })
  @IsOptional()
  @IsEnum(SortOrder)
  @Transform(({ value }) => (value ? value?.toUpperCase() : SortOrder.DESC))
  sortOrder?: SortOrder;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
