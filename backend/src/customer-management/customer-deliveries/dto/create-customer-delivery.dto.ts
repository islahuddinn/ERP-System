import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CustomerDeliveryItemDto } from "./customer-delivery-item.dto";

export class CreateCustomerDeliveryDto {
  @ApiProperty({ description: "Shop (Customer) receiving the delivery" })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ description: "Prior order this delivery fulfills, fully or partially" })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ type: [CustomerDeliveryItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "A delivery must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CustomerDeliveryItemDto)
  items: CustomerDeliveryItemDto[];

  @ApiPropertyOptional({
    description: "Flat discount deducted from the delivery's total",
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
