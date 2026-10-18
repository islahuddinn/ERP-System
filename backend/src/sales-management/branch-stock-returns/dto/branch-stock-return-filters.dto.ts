import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BranchStockReturnStatus } from "../utils/enums";

export class BranchStockReturnFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by the originating transfer" })
  @IsOptional()
  @IsUUID()
  transferId?: string;

  @ApiPropertyOptional({ description: "Filter by the branch returning stock" })
  @IsOptional()
  @IsUUID()
  returningBranchId?: string;

  @ApiPropertyOptional({ description: "Filter by the branch receiving the return" })
  @IsOptional()
  @IsUUID()
  receivingBranchId?: string;

  @ApiPropertyOptional({ enum: BranchStockReturnStatus })
  @IsOptional()
  @IsEnum(BranchStockReturnStatus)
  status?: BranchStockReturnStatus;
}
