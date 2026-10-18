import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsDecimal, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateTaxRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(4)
  countryCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsDecimal()
  slabMin: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDecimal()
  slabMax?: string | null;

  @ApiProperty()
  @IsDecimal()
  ratePercent: string;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}


