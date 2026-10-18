import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

/**
 * No price field — it's resolved server-side at creation, all-or-nothing,
 * via BranchProductPricesService.resolvePrice() (see the service).
 */
export class BranchStockRequestItemDto {
  @ApiProperty({ description: "Product being requested" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Quantity requested" })
  @IsNumber()
  @IsPositive()
  quantity: number;
}
