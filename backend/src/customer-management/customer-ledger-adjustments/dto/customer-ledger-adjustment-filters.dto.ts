import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { CustomerLedgerAdjustmentType } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class CustomerLedgerAdjustmentFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by shop (customer)" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ enum: CustomerLedgerAdjustmentType })
  @IsOptional()
  @IsEnum(CustomerLedgerAdjustmentType)
  type?: CustomerLedgerAdjustmentType;
}
