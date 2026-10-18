import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsDecimal, IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { SalaryFrequency } from "@prisma/tenant-client";

export class CreateSalaryRevisionDto {
  @ApiProperty({ description: "New base salary amount" })
  @IsDecimal({ decimal_digits: "0,2" })
  baseSalary: string;

  @ApiPropertyOptional({ description: "ISO 4217 currency code", default: "PKR", maxLength: 3 })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ enum: SalaryFrequency, default: SalaryFrequency.MONTHLY })
  @IsOptional()
  @IsEnum(SalaryFrequency)
  salaryFrequency?: SalaryFrequency;

  @ApiPropertyOptional({
    description:
      "Effective date (ISO string). Defaults to contract startDate when nested in CreateContractDto.",
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Reason for the revision (e.g. Annual increment, Promotion)",
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
