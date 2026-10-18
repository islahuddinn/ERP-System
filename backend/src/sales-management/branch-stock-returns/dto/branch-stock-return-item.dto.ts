import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

/**
 * No price field — unitPrice is always copied from the originating
 * BranchStockTransferItem at creation time, never accepted from the client.
 */
export class BranchStockReturnItemDto {
  @ApiProperty({ description: "The transfer item this return line is against" })
  @IsUUID()
  @IsNotEmpty()
  transferItemId: string;

  @ApiProperty({ description: "Quantity being returned" })
  @IsNumber()
  @IsPositive()
  quantity: number;
}
