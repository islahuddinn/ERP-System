import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class RegionFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TerritoryStatus })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;
}
