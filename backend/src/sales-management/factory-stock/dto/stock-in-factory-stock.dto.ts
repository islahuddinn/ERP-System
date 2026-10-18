import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

export class StockInFactoryStockDto {
  @ApiProperty({ description: "Product being added to factory stock" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Quantity to add — always positive" })
  @IsNumber()
  @IsPositive()
  quantity: number;
}
