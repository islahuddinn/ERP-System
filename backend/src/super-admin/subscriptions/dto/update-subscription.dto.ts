import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { SubscriptionType } from "@prisma/master-client";
import { Type } from "class-transformer";

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionType, required: false })
  @IsOptional()
  @IsEnum(SubscriptionType)
  type?: SubscriptionType;

  @ApiPropertyOptional({ example: "2024-01-01T00:00:00Z", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2024-12-31T23:59:59Z", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 99.99, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({ example: "USD", required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: "Monthly subscription plan", required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
