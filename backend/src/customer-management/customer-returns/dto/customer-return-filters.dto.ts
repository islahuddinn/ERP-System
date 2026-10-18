import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CustomerReturnStatus } from "../utils/enums";

export class CustomerReturnFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by shop (customer) — used for the Shop tab" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: "Filter by sales person — used for the Sales Person tab" })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;

  @ApiPropertyOptional({ description: "Filter by product" })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by the originating delivery item" })
  @IsOptional()
  @IsUUID()
  deliveryItemId?: string;

  @ApiPropertyOptional({ enum: CustomerReturnStatus })
  @IsOptional()
  @IsEnum(CustomerReturnStatus)
  status?: CustomerReturnStatus;
}
