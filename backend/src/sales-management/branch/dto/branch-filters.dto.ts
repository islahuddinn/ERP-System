import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { TerritoryStatus, BranchType } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class BranchFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TerritoryStatus })
  @IsOptional()
  @IsEnum(TerritoryStatus)
  status?: TerritoryStatus;

  @ApiPropertyOptional({ description: "Filter branches belonging to a specific city" })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    enum: BranchType,
    description: "Filter to only Primary or only Secondary branches",
  })
  @IsOptional()
  @IsEnum(BranchType)
  type?: BranchType;
}
