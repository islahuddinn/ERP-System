import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsNumber, Min, Max } from "class-validator";
import { Transform } from "class-transformer";

export class SummaryQueryDto {
  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2024-12-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: 10,
    required: false,
    description: "Limit for top suppliers",
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
