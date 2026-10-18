import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { ProductBonusGroupStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ProductBonusGroupFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductBonusGroupStatus })
  @IsOptional()
  @IsEnum(ProductBonusGroupStatus)
  status?: ProductBonusGroupStatus;
}
