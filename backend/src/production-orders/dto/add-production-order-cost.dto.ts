import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { ProductionCostType } from "@prisma/tenant-client";

export class AddProductionOrderCostDto {
  @ApiProperty({ enum: ProductionCostType, example: ProductionCostType.LABOUR })
  @IsEnum(ProductionCostType)
  costType: ProductionCostType;

  @ApiPropertyOptional({ example: "Overtime wages for night shift" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0.01)
  amount: number;
}
