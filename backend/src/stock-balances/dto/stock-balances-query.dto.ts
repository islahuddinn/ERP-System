import { IsOptional, IsInt, Min, Max, IsString } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class StockBalancesQueryDto {
  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({ required: false, description: "Filter by product ID" })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ required: false, description: "Filter by location ID" })
  @IsOptional()
  @IsString()
  locationId?: string;
}
