import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from "class-validator";
import { PurchaseStatus, PaymentStatus } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { TransformPurchaseStatus } from "../../common/utils/query-status-transform.util";

export class PurchaseQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "uuid-of-supplier" })
  @IsOptional()
  @IsString()
  supplierId?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @TransformPurchaseStatus()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
