import { ApiPropertyOptional } from "@nestjs/swagger";
import { HolidayType } from "@prisma/tenant-client";
import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class HolidayFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: HolidayType, description: "Filter by holiday type" })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @ApiPropertyOptional({ description: "Filter holidays that fall within this calendar year" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(9999)
  year?: number;
}
