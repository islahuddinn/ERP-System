import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ProductBrandStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ProductBrandFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductBrandStatus })
  @IsOptional()
  @IsEnum(ProductBrandStatus)
  status?: ProductBrandStatus;
}
