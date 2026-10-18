import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class MarkCustomerDeliveryDeliveredItemDto {
  @ApiProperty({ description: "The delivery item being confirmed" })
  @IsUUID()
  @IsNotEmpty()
  deliveryItemId: string;

  @ApiProperty({
    description:
      "Quantity actually delivered — can be less than the pending quantity if short on stock, never more",
  })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class MarkCustomerDeliveryDeliveredDto {
  @ApiPropertyOptional({
    type: [MarkCustomerDeliveryDeliveredItemDto],
    description:
      "Only send items whose delivered quantity is less than what was pending (e.g. short on stock). Price is never accepted here — it always stays what was set when the delivery was created. Omit entirely to confirm the full pending quantities as-is.",
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MarkCustomerDeliveryDeliveredItemDto)
  items?: MarkCustomerDeliveryDeliveredItemDto[];
}
