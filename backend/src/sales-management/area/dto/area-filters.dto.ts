import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { TerritoryStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class AreaFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TerritoryStatus })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;

  @ApiPropertyOptional({ description: "Filter areas belonging to a specific branch" })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
