import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class ConfirmBranchStockTransferReceiptItemDto {
  @ApiProperty({ description: "The transfer item this receipt line is for" })
  @IsUUID()
  @IsNotEmpty()
  transferItemId: string;

  @ApiProperty({
    description:
      "Quantity actually received for this item — may be less than what was dispatched (damage/loss in transit)",
  })
  @IsNumber()
  @Min(0)
  receivedQuantity: number;
}
