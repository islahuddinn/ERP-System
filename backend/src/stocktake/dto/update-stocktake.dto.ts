import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class UpdateStocktakeDto {
  @ApiProperty({ example: 50, required: false })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({}, { message: "Counted quantity must be a number" })
  @Min(0, { message: "Counted quantity must be greater than or equal to 0" })
  countedQuantity?: number;

  @ApiProperty({ example: "Updated stock count notes", required: false })
  @IsOptional()
  @IsString()
  remarks?: string;
}
