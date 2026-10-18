import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDecimal, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateGradeDto {
  @ApiProperty({ description: "Grade name (e.g. G1, G2, Manager)" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  name: string;

  @ApiProperty({ description: "Grade level (numeric ordering)", example: 1 })
  @IsInt()
  @Min(1)
  @Max(1000)
  level: number;

  @ApiProperty({ description: "Minimum salary band", example: "50000.00" })
  @IsDecimal()
  salaryBandMin: string;

  @ApiProperty({ description: "Maximum salary band", example: "150000.00" })
  @IsDecimal()
  salaryBandMax: string;

  @ApiPropertyOptional({ description: "Optional notes or description" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  description?: string;
}

