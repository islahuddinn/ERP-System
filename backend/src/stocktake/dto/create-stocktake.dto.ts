import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateStocktakeDto {
  @ApiProperty({ example: "uuid-of-product" })
  @IsString()
  @IsString()
  productId: string;

  @ApiProperty({ example: "uuid-of-location", required: false })
  @IsString()
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ example: "uuid-of-warehouse", required: false })
  @IsString()
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiProperty({ example: "uuid-of-zone", required: false })
  @IsString()
  @IsString()
  @IsOptional()
  zoneId?: string;

  @ApiProperty({ example: 50 })
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: "Counted quantity must be a number" })
  @Min(0, { message: "Counted quantity must be greater than or equal to 0" })
  countedQuantity: number;

  @ApiProperty({ example: "Stock count notes", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}
