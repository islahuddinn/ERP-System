import { ApiProperty } from "@nestjs/swagger";
import { IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateProductDto } from "./create-product.dto";

export class BulkCreateProductDto {
  @ApiProperty({
    type: [CreateProductDto],
    description: "Array of products to create",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  products: CreateProductDto[];
}
