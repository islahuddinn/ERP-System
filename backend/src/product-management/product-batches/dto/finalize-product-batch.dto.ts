import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class FinalizeProductBatchDto {
  @ApiPropertyOptional({
    example: 1500,
    description: "Retail price per unit for this finished batch",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional({
    example: 1350,
    description: "Sale/promotional price per unit",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({ example: "2026-06-16", description: "Manufacturing date of the batch" })
  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @ApiPropertyOptional({ example: "2027-06-16", description: "Expiry date of the batch" })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
