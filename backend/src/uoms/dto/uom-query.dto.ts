import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { UomCategory } from "../utils/enums";

export class UomQueryDto {
  @ApiPropertyOptional({ enum: UomCategory, description: "Filter by category" })
  @IsOptional()
  @IsEnum(UomCategory)
  category?: UomCategory;
}
