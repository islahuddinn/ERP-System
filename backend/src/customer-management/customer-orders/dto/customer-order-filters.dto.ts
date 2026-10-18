import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CustomerOrderStatus } from "../utils/enums";

export class CustomerOrderFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by shop (customer) — used for the Shop tab" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: "Filter by sales person — used for the Sales Person tab" })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;

  @ApiPropertyOptional({ enum: CustomerOrderStatus, description: "Filter by fulfillment status" })
  @IsOptional()
  @IsEnum(CustomerOrderStatus)
  status?: CustomerOrderStatus;
}
