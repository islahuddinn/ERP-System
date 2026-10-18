import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateContractDto {
  // ── Assignment overrides (allowed on DRAFT contracts) ──────────────────

  @ApiPropertyOptional({ description: "Update position" })
  @IsOptional()
  @IsString()
  positionId?: string;

  @ApiPropertyOptional({ description: "Update department" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  // ── Duration ───────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: "Update start date" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "Update end date" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: "Update probation end date" })
  @IsOptional()
  @IsDateString()
  probationEndDate?: string;

  // ── Leaves ─────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: "Update total leave quota for this period (half-day increments allowed)" })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  totalLeaves?: number;

  // ── Remarks ────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: "Update notes or remarks" })
  @IsOptional()
  @IsString()
  notes?: string;
}
