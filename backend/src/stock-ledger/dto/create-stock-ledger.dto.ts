import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  Min,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TransactionType } from "@prisma/tenant-client";

export class CreateStockLedgerDto {
  @ApiProperty({ description: "Product ID" })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: "Warehouse ID" })
  @IsString()
  @IsOptional()
  warehouseId?: string;

  @ApiPropertyOptional({ description: "Zone ID" })
  @IsString()
  @IsOptional()
  zoneId?: string;

  @ApiPropertyOptional({
    description: "Batch ID (for specific batch operations)",
  })
  @IsString()
  @IsOptional()
  batchId?: string;

  @ApiProperty({
    description: "Quantity (positive for increase, negative for decrease)",
  })
  @IsNumber()
  @Min(0.01, { message: "Quantity must be greater than 0" })
  quantity: number;

  @ApiProperty({ enum: TransactionType, description: "Transaction type" })
  @IsEnum(TransactionType)
  movementType: TransactionType;

  @ApiProperty({
    description: "Reference type (e.g., PURCHASE, SALE, TRANSFER)",
  })
  @IsString()
  referenceType: string;

  @ApiProperty({ description: "Reference ID" })
  @IsString()
  referenceId: string;

  @ApiPropertyOptional({ description: "Remarks" })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiPropertyOptional({
    description: "Use FIFO for consumption (default: true)",
  })
  @IsBoolean()
  @IsOptional()
  useFIFO?: boolean;

  @ApiPropertyOptional({
    description: "Allow expired batches (default: false)",
  })
  @IsBoolean()
  @IsOptional()
  allowExpired?: boolean;

  // Batch creation fields (for increases)
  @ApiPropertyOptional({
    description: "Batch number (auto-generated if not provided)",
  })
  @IsString()
  @IsOptional()
  batchNumber?: string;

  @ApiPropertyOptional({ description: "Expiry date" })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({ description: "Manufacturing date" })
  @IsDateString()
  @IsOptional()
  manufacturingDate?: string;

  @ApiPropertyOptional({ description: "Received date" })
  @IsDateString()
  @IsOptional()
  receivedDate?: string;
}
