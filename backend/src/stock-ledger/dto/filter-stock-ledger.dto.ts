import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { StockTransactionType } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FilterStockLedgerDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Product ID" })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiPropertyOptional({ description: "Warehouse ID" })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({ description: "Zone ID" })
  @IsString()
  @IsOptional()
  zoneId?: string;

  @ApiPropertyOptional({ description: "Batch ID" })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiPropertyOptional({
    enum: StockTransactionType,
    description: "Transaction type",
  })
  @IsEnum(StockTransactionType)
  @IsOptional()
  transactionType?: StockTransactionType;

  @ApiPropertyOptional({ description: "Reference type" })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ description: "Reference ID" })
  @IsString()
  @IsOptional()
  referenceId?: string;

  @ApiPropertyOptional({ description: "Created by user ID" })
  @IsString()
  @IsOptional()
  createdById?: string;

  @ApiPropertyOptional({ description: "Start date (ISO string)" })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO string)" })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
