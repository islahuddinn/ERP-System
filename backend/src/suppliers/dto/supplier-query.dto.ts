import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsBoolean } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class SupplierQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isActive?: boolean;
}
