import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ProductGroupStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ProductGroupFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductGroupStatus })
  @IsOptional()
  @IsEnum(ProductGroupStatus)
  status?: ProductGroupStatus;
}
