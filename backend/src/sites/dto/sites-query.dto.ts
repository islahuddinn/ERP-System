import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsEnum } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { SiteType } from "../enums/site-type.enum";
import { SiteCategory } from "../enums/site-category.enum";
import { SiteStatus } from "../enums/site-status.enum";

export class SitesQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SiteType, description: "Filter by site type" })
  @IsOptional()
  @IsEnum(SiteType)
  type?: SiteType;

  @ApiPropertyOptional({ enum: SiteCategory, description: "Filter by inventory category" })
  @IsOptional()
  @IsEnum(SiteCategory)
  category?: SiteCategory;

  @ApiPropertyOptional({ enum: SiteStatus, description: "Filter by site status" })
  @IsOptional()
  @IsEnum(SiteStatus)
  status?: SiteStatus;
}
