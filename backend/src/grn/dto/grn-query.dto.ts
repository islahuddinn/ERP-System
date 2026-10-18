import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, Matches } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { TransformGrnStatus } from "../../common/utils/query-status-transform.util";
import { ReceivingStatus, ReceivingType } from "@prisma/tenant-client";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class GrnQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "PENDING" })
  @IsOptional()
  @TransformGrnStatus()
  @IsEnum(ReceivingStatus)
  status?: ReceivingStatus;

  @ApiPropertyOptional({ example: "PURCHASE_ORDER" })
  @IsOptional()
  @IsEnum(ReceivingType)
  receivingType?: ReceivingType;

  @ApiPropertyOptional({ example: "2025-01-01" })
  @IsOptional()
  @Matches(ISO_DATE, { message: "startDate must be in YYYY-MM-DD format" })
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @Matches(ISO_DATE, { message: "endDate must be in YYYY-MM-DD format" })
  endDate?: string;
}

export type FactoryReceivingQueryDto = GrnQueryDto;
