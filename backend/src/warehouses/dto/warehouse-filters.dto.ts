import { IsOptional, IsString, IsEnum, IsBoolean, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { WarehouseType, WarehouseStatus } from "@prisma/tenant-client";

export class WarehouseFiltersDto {
  @ApiPropertyOptional({ description: "Page number", example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: "Search by name or code" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: WarehouseType,
    description: "Filter by warehouse type",
  })
  @IsOptional()
  @IsEnum(WarehouseType)
  warehouseType?: WarehouseType;

  @ApiPropertyOptional({
    enum: WarehouseStatus,
    description: "Filter by status",
  })
  @IsOptional()
  @IsEnum(WarehouseStatus)
  status?: WarehouseStatus;

  @ApiPropertyOptional({ description: "Filter by location ID" })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: "Filter by manager ID" })
  @IsOptional()
  @IsString()
  managerId?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}
