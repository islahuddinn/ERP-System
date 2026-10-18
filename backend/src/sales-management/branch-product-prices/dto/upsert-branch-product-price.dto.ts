import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";

export class UpsertBranchProductPriceDto {
  @ApiProperty({ description: "Product this price applies to" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Standard price this seller charges for the product" })
  @IsNumber()
  @IsPositive()
  price: number;
}
