import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsObject, IsEnum } from "class-validator";
import { DistributionPricingMode } from "@prisma/tenant-client";

export class UpdateAccountSettingsDto {
  @ApiPropertyOptional({
    enum: DistributionPricingMode,
    description: "FIXED_PRICE: price by buyer's tier. FREE_PRICE: each seller sets their own.",
  })
  @IsOptional()
  @IsEnum(DistributionPricingMode)
  distributionPricingMode?: DistributionPricingMode;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
