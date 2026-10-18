import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { CustomerOrderItemDto } from "./customer-order-item.dto";

export class CreateCustomerOrderDto {
  @ApiProperty({ description: "Shop (Customer) placing the order" })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ type: [CustomerOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "An order must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => CustomerOrderItemDto)
  items: CustomerOrderItemDto[];

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
