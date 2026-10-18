import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsPositive, IsUUID } from "class-validator";
import { PriceListTier } from "../utils/enums";

export class UpsertPriceListEntryDto {
  @ApiProperty({
    enum: PriceListTier,
    description: "Which of the 4 price lists this entry belongs to",
  })
  @IsEnum(PriceListTier)
  tier: PriceListTier;

  @ApiProperty({ description: "Product this price applies to" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Price for this product at this tier" })
  @IsNumber()
  @IsPositive()
  price: number;
}
