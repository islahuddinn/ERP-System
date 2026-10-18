import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { TransporterStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class TransporterFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TransporterStatus })
  @IsOptional()
  @IsEnum(TransporterStatus)
  status?: TransporterStatus;
}
