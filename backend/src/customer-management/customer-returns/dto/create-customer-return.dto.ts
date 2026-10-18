import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { CustomerReturnReason } from "../utils/enums";

/**
 * No customerId, productId, or unitPrice — all three are derived server-side
 * from the referenced delivery item, so a return can never diverge from what
 * was actually delivered (see CustomerReturnsService.createCustomerReturn).
 */
export class CreateCustomerReturnDto {
  @ApiProperty({
    description: "The delivery item this return is against — product, price and shop are all derived from it",
  })
  @IsUUID()
  @IsNotEmpty()
  deliveryItemId: string;

  @ApiProperty({ description: "Quantity being returned — cannot exceed what's still outstanding on this delivery item" })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ enum: CustomerReturnReason, description: "Why the goods are being returned" })
  @IsEnum(CustomerReturnReason)
  reason: CustomerReturnReason;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
