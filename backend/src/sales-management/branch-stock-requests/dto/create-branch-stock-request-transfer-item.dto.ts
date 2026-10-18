import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

export class CreateBranchStockRequestTransferItemDto {
  @ApiProperty({ description: "The request item this shipment is fulfilling" })
  @IsUUID()
  @IsNotEmpty()
  requestItemId: string;

  @ApiProperty({
    description: "Quantity to send now — cannot exceed what's still outstanding on this item",
  })
  @IsNumber()
  @IsPositive()
  quantity: number;
}
