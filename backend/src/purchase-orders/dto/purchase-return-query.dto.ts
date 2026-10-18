import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
} from "class-validator";
import { ReturnStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class PurchaseReturnQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "uuid-of-supplier" })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ example: "uuid-of-purchase-order" })
  @IsOptional()
  @IsString()
  purchaseOrderId?: string;

  @ApiPropertyOptional({ example: "uuid-of-grn" })
  @IsOptional()
  @IsString()
  grnId?: string;

  @ApiPropertyOptional({ enum: ReturnStatus })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({
    example: "2026-01-01",
    description: "Filter returns with a returnDate on or after this date",
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    example: "2026-12-31",
    description: "Filter returns with a returnDate on or before this date",
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
