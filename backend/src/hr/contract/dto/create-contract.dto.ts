import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ContractType } from "@prisma/tenant-client";
import { CreateSalaryRevisionDto } from "./create-salary-revision.dto";

export class CreateContractDto {
  // ── Employee & assignment ──────────────────────────────────────────────

  @ApiProperty({ description: "Employee ID this contract belongs to" })
  @IsString()
  employeeId: string;

  @ApiPropertyOptional({ description: "Position at time of contract" })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: "Department at time of contract" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  // ── Classification ─────────────────────────────────────────────────────

  @ApiProperty({ enum: ContractType, description: "Type of employment contract" })
  @IsEnum(ContractType)
  contractType: ContractType;

  // ── Duration ───────────────────────────────────────────────────────────

  @ApiProperty({ description: "Contract start date (ISO date string)" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: "Contract end date (ISO date string). Omit for an open-ended/permanent contract.",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Probation period end date (ISO date string)" })
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  // ── Leaves ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      "Total leave days allowed for this contract period (half-day increments allowed). " +
      "Optional — defaults to 15 when omitted.",
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  totalLeaves?: number;

  // ── Initial salary (shared DTO — creates the first SalaryRevision) ─────

  @ApiProperty({
    type: CreateSalaryRevisionDto,
    description: "Initial salary details for this contract",
  })
  @ValidateNested()
  @Type(() => CreateSalaryRevisionDto)
  salary: CreateSalaryRevisionDto;

  // ── Remarks ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: "Additional notes or remarks" })
  @IsOptional()
  @IsString()
  notes?: string;
}
