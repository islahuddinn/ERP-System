import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from "class-validator";

export class CustomerDeliveryItemDto {
  @ApiProperty({ description: "Product being delivered" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: "Order item this delivery line fulfills, if delivering against a prior order",
  })
  @IsOptional()
  @IsUUID()
  orderItemId?: string;

  @ApiProperty({ description: "Quantity delivered now" })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description:
      "Unit price — required only when there is no orderItemId. When orderItemId is set, the order's agreed price is always used and this is ignored, so the price a customer agreed to can never be changed at delivery time",
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;
}
