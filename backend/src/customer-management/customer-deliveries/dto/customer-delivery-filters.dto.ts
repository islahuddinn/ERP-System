import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { CustomerDeliveryStatus } from "@prisma/tenant-client";

export class CustomerDeliveryFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: CustomerDeliveryStatus,
    description: "Filter by status — e.g. PENDING for the branch's fulfillment queue",
  })
  @IsOptional()
  @IsEnum(CustomerDeliveryStatus)
  status?: CustomerDeliveryStatus;

  @ApiPropertyOptional({ description: "Filter by shop (customer) — used for the Shop tab" })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: "Filter by sales person — used for the Sales Person tab" })
  @IsOptional()
  @IsUUID()
  salesPersonId?: string;

  @ApiPropertyOptional({ description: "Filter by product (matches any item on the delivery)" })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: "Filter by the order this delivery fulfills" })
  @IsOptional()
  @IsUUID()
  orderId?: string;
}
