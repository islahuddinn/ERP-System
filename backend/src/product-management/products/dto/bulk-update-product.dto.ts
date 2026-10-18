import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ValidateNested, IsString, IsOptional } from "class-validator";
import { Type } from "class-transformer";
import { UpdateProductDto } from "./update-product.dto";

export class BulkUpdateItemDto {
  @ApiProperty({ description: "Product ID to update" })
  @IsString()
  id: string;

  @ApiProperty({
    type: UpdateProductDto,
    description: "Product data to update",
  })
  @ValidateNested()
  @Type(() => UpdateProductDto)
  data: UpdateProductDto;
}

export class BulkUpdateProductDto {
  @ApiProperty({
    type: [BulkUpdateItemDto],
    description: "Array of product updates",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates: BulkUpdateItemDto[];
}
