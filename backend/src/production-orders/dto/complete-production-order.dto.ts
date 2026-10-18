import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
  IsString,
} from "class-validator";

export class CompleteProductionOrderDto {
  @ApiProperty({ example: 98, description: "Actual quantity produced" })
  @IsNumber()
  @Min(1)
  producedQuantity: number;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      "Whether this output is a finished good ready for stock/sale. If false, the created " +
      "product batch is treated as work-in-progress and does not affect Product.currentStock " +
      "until it is later marked finished via the product-batches stage endpoint.",
  })
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @ApiPropertyOptional({ description: "Manufacturing date for the produced batch" })
  @IsOptional()
  @IsDateString()
  manufacturingDate?: string;

  @ApiPropertyOptional({ description: "Expiry date for the produced batch" })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiPropertyOptional({ description: "Retail price to set on the produced batch" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @ApiPropertyOptional({ description: "Sale price to set on the produced batch" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salePrice?: number;

  @ApiPropertyOptional({
    description: "Site where the produced batch is located (defaults to the order's site)",
  })
  @IsOptional()
  @IsString()
  siteId?: string;
}
