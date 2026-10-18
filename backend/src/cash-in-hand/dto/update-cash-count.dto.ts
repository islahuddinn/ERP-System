import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class UpdateCashCountDto {
  @ApiProperty({
    example: 1050.0,
    description: "Actual cash count",
    required: false,
  })
  @IsOptional()
  @IsNumber()
  actualCount?: number;

  @ApiProperty({
    example: "Cash counted and verified",
    description: "Notes about the count",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
