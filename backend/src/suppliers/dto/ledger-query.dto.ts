import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsDateString } from "class-validator";

export class LedgerQueryDto {
  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2024-12-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
