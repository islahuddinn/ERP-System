import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsDateString, IsEnum } from "class-validator";
import { Type } from "class-transformer";
import { IsNumber, Min, Max } from "class-validator";
import { SupplierTransactionType } from "@prisma/tenant-client";

export class TransactionQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2024-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: SupplierTransactionType })
  @IsOptional()
  @IsEnum(SupplierTransactionType)
  type?: SupplierTransactionType;
}
