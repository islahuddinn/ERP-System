import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class CustomerRecoveryFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by shop (customer) — used for the Shop tab" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: "Filter by sales person — used for the Sales Person tab" })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;
}
