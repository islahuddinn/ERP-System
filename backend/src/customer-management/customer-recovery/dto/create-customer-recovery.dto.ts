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
import { PaymentMethod } from "../utils/enums";

export class CreateCustomerRecoveryDto {
  @ApiProperty({ description: "Shop (Customer) making the payment" })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: "Amount collected" })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: PaymentMethod, description: "How the payment was made" })
  @IsEnum(PaymentMethod)
  paymentMode: PaymentMethod;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
