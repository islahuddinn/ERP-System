import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { PriceListTier } from "../utils/enums";

export class PriceListHistoryQueryDto {
  @ApiProperty({ enum: PriceListTier, description: "Which tier's price history to fetch" })
  @IsEnum(PriceListTier)
  tier: PriceListTier;
}
