import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsDateString,
  IsString,
  IsEnum,
} from "class-validator";
import { PurchaseStatus } from "@prisma/tenant-client";

export class ReportsQueryDto {
  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: "uuid-of-supplier" })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: "uuid-of-raw-material" })
  @IsOptional()
  @IsString()
  rawMaterialId?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;
}
