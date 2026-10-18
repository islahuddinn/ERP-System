import { ApiPropertyOptional } from "@nestjs/swagger";
import { ShiftType } from "@prisma/tenant-client";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ShiftFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ShiftType, description: "Filter by shift type" })
  @IsOptional()
  @IsEnum(ShiftType)
  type?: ShiftType;
}
