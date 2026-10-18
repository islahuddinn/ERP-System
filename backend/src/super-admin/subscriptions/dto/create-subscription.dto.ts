import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsNotEmpty,
} from "class-validator";
import { SubscriptionType } from "@prisma/master-client";

export class CreateSubscriptionDto {
  @ApiProperty({ type: String, default: `8afe8928-e559-4b39-b966-f33b721dbe3c` })
  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @ApiProperty({
    enum: SubscriptionType,
    default: SubscriptionType.MONTHLY,
  })
  @IsNotEmpty()
  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  @ApiProperty({ default: "2024-01-01T00:00:00Z" })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ type: Number, example: 99.99, default: 99.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ type: String, example: "USD", default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: String, example: "Monthly subscription plan" })
  @IsOptional()
  @IsString()
  notes?: string;
}
