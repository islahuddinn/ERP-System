import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
} from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { SaleStatus, PaymentStatus } from "@prisma/tenant-client";

export class SaleFiltersDto extends PaginationDto {
  @ApiProperty({
    example: "2024-01-01",
    description: "Start date (ISO string)",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    example: "2024-01-31",
    description: "End date (ISO string)",
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    example: "uuid-of-location",
    description: "Filter by location",
    required: false,
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiProperty({
    example: "uuid-of-customer",
    description: "Filter by customer",
    required: false,
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({
    example: "uuid-of-user",
    description: "Filter by user who created sale",
    required: false,
  })
  @IsOptional()
  @IsString()
  createdById?: string;

  @ApiProperty({
    example: "COMPLETED",
    enum: SaleStatus,
    description: "Filter by sale status",
    required: false,
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiProperty({
    example: "COMPLETED,PARTIAL",
    description: "Filter by multiple sale statuses (comma-separated)",
    required: false,
  })
  @IsOptional()
  @IsString()
  statuses?: string;

  @ApiProperty({
    example: "PAID",
    enum: PaymentStatus,
    description: "Filter by payment status",
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    example: "POS-20240101-0001",
    description: "Search by sale number",
    required: false,
  })
  @IsOptional()
  @IsString()
  saleNumber?: string;
}
