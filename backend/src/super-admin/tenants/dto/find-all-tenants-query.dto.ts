import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { TenantStatus } from "@prisma/master-client/client";

export class TenantQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({
    example: false,
    description: "If true, returns only deleted records. Otherwise returns active records.",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true")
  includeDeleted?: boolean;
}
