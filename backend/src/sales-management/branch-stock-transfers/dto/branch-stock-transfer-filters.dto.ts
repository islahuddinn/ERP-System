import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BranchStockTransferStatus } from "../utils/enums";

export class BranchStockTransferFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by sending branch" })
  @IsOptional()
  @IsUUID()
  fromBranchId?: string;

  @ApiPropertyOptional({ description: "Filter by receiving branch" })
  @IsOptional()
  @IsUUID()
  toBranchId?: string;

  @ApiPropertyOptional({ enum: BranchStockTransferStatus })
  @IsOptional()
  @IsEnum(BranchStockTransferStatus)
  status?: BranchStockTransferStatus;

  @ApiPropertyOptional({
    description: "Filter by the request this transfer fulfils — a request can have several",
  })
  @IsOptional()
  @IsUUID()
  requestId?: string;
}
