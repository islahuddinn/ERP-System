import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PayrollStatusFilter {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export class PayrollQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filter by employee ID' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payroll status',
    enum: PayrollStatusFilter,
  })
  @IsOptional()
  @IsEnum(PayrollStatusFilter)
  status?: PayrollStatusFilter;

  @ApiPropertyOptional({
    description: 'Filter by paid month (YYYY-MM format)',
    example: '2026-07',
  })
  @IsOptional()
  paidMonth?: string;

  @ApiPropertyOptional({ description: 'Search by employee code or name' })
  @IsOptional()
  search?: string;
}
