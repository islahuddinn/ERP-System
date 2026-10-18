import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class AddProductionOrderWasteDto {
  @ApiProperty({ example: "uuid-of-waste-management-record" })
  @IsString()
  wasteManagementId: string;

  @ApiProperty({ example: 5, description: "Quantity of waste material used as input" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 12.5, description: "Cost per unit of the waste material used" })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty({ example: 62.5, description: "Total cost of the waste material used" })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiPropertyOptional({ example: "Recycled offcuts fed into this order" })
  @IsOptional()
  @IsString()
  notes?: string;
}
