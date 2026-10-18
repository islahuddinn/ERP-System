import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { CustomerCategoryStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class CustomerCategoryFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: CustomerCategoryStatus })
  @IsOptional()
  @IsEnum(CustomerCategoryStatus)
  status?: CustomerCategoryStatus;
}
