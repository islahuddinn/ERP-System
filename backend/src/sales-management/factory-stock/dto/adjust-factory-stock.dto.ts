import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString, IsUUID, NotEquals } from "class-validator";

// Signed correction — positive to add (e.g. a recount found more than
// recorded), negative to remove (e.g. wastage). Never zero; a zero delta
// isn't a correction and just clutters the audit log for no reason.
export class AdjustFactoryStockDto {
  @ApiProperty({ description: "Product whose factory stock is being corrected" })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ description: "Signed quantity change — positive to add, negative to remove" })
  @IsNumber()
  @NotEquals(0)
  delta: number;

  @ApiProperty({
    description: "Why this correction is being made, e.g. wastage or stock count fix",
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
