import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CompleteProductBatchStageDto {
  @ApiProperty({
    example: 95,
    description:
      "Good/approved quantity for this stage. Must be ≥ 1. " +
      "approvedQuantity + rejectedQuantity must equal the stage's receivedQuantity.",
  })
  @IsNumber()
  @Min(1)
  approvedQuantity: number;

  @ApiPropertyOptional({ example: 5, default: 0, description: "Quantity rejected at this stage" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rejectedQuantity?: number;

  @ApiPropertyOptional({
    example: 200,
    default: 0,
    description: "Additional cost incurred at this stage (labour, packaging materials, etc.)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
