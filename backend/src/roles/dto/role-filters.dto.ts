import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class RoleFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by system roles only" })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  isSystem?: boolean;
}
