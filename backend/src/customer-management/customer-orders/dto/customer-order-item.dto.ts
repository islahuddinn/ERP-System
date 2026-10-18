import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsUUID } from "class-validator";

export class CustomerOrderItemDto {
  @ApiProperty({ description: "Product being ordered" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Quantity ordered" })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description:
      "Price for this item. Ignored entirely in FIXED_PRICE mode — the shop's price tier always wins there. In FREE_PRICE mode, omit to fall back to my branch's standard price list.",
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  unitPrice?: number;
}
