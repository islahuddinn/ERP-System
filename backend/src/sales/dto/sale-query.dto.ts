import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEnum, IsDateString } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { SaleStatus, PaymentStatus } from "@prisma/tenant-client";

export class SaleQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: "customer-uuid" })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
