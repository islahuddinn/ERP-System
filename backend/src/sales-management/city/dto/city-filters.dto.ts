import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class CityFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TerritoryStatus })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;

  @ApiPropertyOptional({ description: "Filter cities belonging to a specific zone" })
  @IsOptional()
  @IsUUID()
  zoneId?: string;
}
