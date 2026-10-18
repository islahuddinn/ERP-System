import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

import { PaymentMethod } from "@prisma/master-client";
import { ApiProperty } from "@nestjs/swagger";

export class CreateSubscriptionPaymentDto {
  @ApiProperty({ type: String })
  @IsNotEmpty()
  @IsString()
  subscriptionId: string;

  @ApiProperty({ type: Number })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsNotEmpty()
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  paymentDate?: string;

  @ApiProperty({ type: String })
  @IsOptional()
  @IsString()
  notes?: string;
}
