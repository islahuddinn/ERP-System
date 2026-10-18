import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsDateString, IsDecimal, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSalaryComponentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name: string;

  @ApiProperty({
    description: "Component type, e.g. EARNING or DEDUCTION",
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiPropertyOptional({
    description: "Optional category for grouping components",
  })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiProperty({
    description: "Calculation type, e.g. FIXED_AMOUNT or PERCENTAGE",
  })
  @IsString()
  @IsNotEmpty()
  calculationType: string;

  @ApiPropertyOptional({
    description: "Fixed amount value (if applicable)",
  })
  @IsOptional()
  @IsDecimal()
  amount?: string | null;

  @ApiPropertyOptional({
    description: "Percentage value (if applicable)",
  })
  @IsOptional()
  @IsDecimal()
  percentage?: string | null;

  @ApiPropertyOptional({
    description: "Optional formula expression evaluated during payroll",
  })
  @IsOptional()
  @IsString()
  formula?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isTaxable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

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

