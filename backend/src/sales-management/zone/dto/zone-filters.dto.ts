import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ZoneFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TerritoryStatus })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;

  @ApiPropertyOptional({ description: "Filter zones belonging to a specific region" })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}
