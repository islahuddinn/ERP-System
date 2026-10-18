import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { BrokerStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class BrokerFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BrokerStatus })
  @IsOptional()
  @IsEnum(BrokerStatus)
  status?: BrokerStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zoneId?: string;
}
