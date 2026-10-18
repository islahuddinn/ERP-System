import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { ProductAdjustmentType } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ProductAdjustmentFiltersDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ enum: ProductAdjustmentType })
  @IsOptional()
  @IsEnum(ProductAdjustmentType)
  type?: ProductAdjustmentType;
}
