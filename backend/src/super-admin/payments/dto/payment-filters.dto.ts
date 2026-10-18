import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsString,
} from "class-validator";
import { PaymentMethod, PaymentStatus } from "@prisma/master-client";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class PaymentFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiPropertyOptional({ required: false })
  @IsOptional()
  @IsString()
  tenantId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({ example: "2024-01-01T00:00:00Z", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2024-12-31T23:59:59Z", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
