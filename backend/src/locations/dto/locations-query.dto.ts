import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class LocationsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by country" })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: "Filter by city" })
  @IsOptional()
  @IsString()
  city?: string;
}
