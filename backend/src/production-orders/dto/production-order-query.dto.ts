import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { ProductionOrderStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { TransformProductionOrderStatus } from "../../common/utils/query-status-transform.util";

export class ProductionOrderQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ProductionOrderStatus })
  @IsOptional()
  @TransformProductionOrderStatus()
  @IsEnum(ProductionOrderStatus)
  status?: ProductionOrderStatus;

  @ApiPropertyOptional({ example: "uuid-of-product" })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ example: "uuid-of-site" })
  @IsOptional()
  @IsString()
  siteId?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
