import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean, IsEnum } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { ProductType } from "../utils/enums";

export class ProductsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductType, description: "Filter by product type" })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ example: true, description: "Filter by active status" })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isActive?: boolean;
}
