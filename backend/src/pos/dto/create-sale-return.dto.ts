import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { PaymentMethod, SaleReturnStatus } from "@prisma/tenant-client";
import { Type } from "class-transformer";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class ReturnItemDto {
  @ApiProperty({
    description: "Original sale item ID",
    example: "uuid-of-sale-item",
  })
  @IsString()
  @IsString()
  originalSaleItemId: string;

  @ApiProperty({ description: "Quantity being returned", example: 2 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantityReturned: number;
}

export class CreateSaleReturnDto {
  @ApiPropertyOptional({
    description: "Location ID to return stock to (defaults to original sale location)",
  })
  @IsOptional()
  @IsString()
  @IsString()
  locationId?: string;

  @ApiProperty({
    description: "Items being returned",
    type: [ReturnItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiProperty({ description: "Reason for the return" })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ enum: PaymentMethod, description: "Refund method" })
  @IsEnum(PaymentMethod)
  refundMethod: PaymentMethod;
}

export class SaleReturnFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: SaleReturnStatus,
    description: "Filter by return status",
  })
  @IsOptional()
  @IsEnum(SaleReturnStatus)
  status?: SaleReturnStatus;

  @ApiPropertyOptional({
    description: "Search by sale number or return number",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Filter by location ID" })
  @IsOptional()
  @IsString()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ description: "Start date (ISO string)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO string)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class ProcessSaleReturnDto {
  @ApiPropertyOptional({
    enum: PaymentMethod,
    description: "Override refund method",
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  refundMethod?: PaymentMethod;

  @ApiPropertyOptional({ description: "Additional notes for processing" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelSaleReturnDto {
  @ApiPropertyOptional({ description: "Reason for cancelling the return" })
  @IsOptional()
  @IsString()
  reason?: string;
}
