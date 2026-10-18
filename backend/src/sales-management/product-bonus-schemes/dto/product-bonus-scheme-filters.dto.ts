import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { ProductBonusSchemeStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ProductBonusSchemeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductBonusSchemeStatus })
  @IsOptional()
  @IsEnum(ProductBonusSchemeStatus)
  status?: ProductBonusSchemeStatus;

  @ApiPropertyOptional({ description: "Filter schemes for a specific bonus group" })
  @IsOptional()
  @IsUUID()
  productBonusGroupId?: string;
}
