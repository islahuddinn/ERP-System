import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsDecimal, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateDeductionRuleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Calculation type, e.g. FIXED_AMOUNT or PERCENTAGE",
  })
  @IsString()
  @IsNotEmpty()
  calculationType: string;

  @ApiPropertyOptional({
    description: "Fixed amount for the deduction (if applicable)",
  })
  @IsOptional()
  @IsDecimal()
  amount?: string | null;

  @ApiPropertyOptional({
    description: "Percentage for the deduction (if applicable)",
  })
  @IsOptional()
  @IsDecimal()
  ratePercent?: string | null;

  @ApiPropertyOptional({
    description: "Optional formula expression evaluated during payroll",
  })
  @IsOptional()
  @IsString()
  formula?: string | null;

  @ApiPropertyOptional({
    description: "Whether this is a statutory / government mandated deduction",
  })
  @IsOptional()
  @IsBoolean()
  isStatutory?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty()
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

