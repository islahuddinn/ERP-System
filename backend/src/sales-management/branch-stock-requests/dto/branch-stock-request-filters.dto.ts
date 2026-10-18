import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BranchStockRequestStatus } from "../utils/enums";

export class BranchStockRequestFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by requesting branch" })
  @IsOptional()
  @IsUUID()
  requesterBranchId?: string;

  @ApiPropertyOptional({ description: "Filter by fulfilling branch" })
  @IsOptional()
  @IsUUID()
  fulfillerBranchId?: string;

  @ApiPropertyOptional({ enum: BranchStockRequestStatus })
  @IsOptional()
  @IsEnum(BranchStockRequestStatus)
  status?: BranchStockRequestStatus;
}
