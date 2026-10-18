import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, Min } from "class-validator";
import { Type } from "class-transformer";
import { SupplierTransactionType } from "@prisma/tenant-client";

export class CreateSupplierTransactionDto {
  @ApiProperty({ example: "2024-01-15" })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: SupplierTransactionType, example: SupplierTransactionType.PAYMENT })
  @IsEnum(SupplierTransactionType)
  type: SupplierTransactionType;

  @ApiPropertyOptional({ example: "REC-001", description: "Receipt or reference number" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiProperty({ example: "Cash payment to supplier" })
  @IsString()
  description: string;

  @ApiProperty({
    example: 5000,
    description: "Debit amount — reduces what factory owes the supplier (payments, returns)",
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty({
    example: 0,
    description:
      "Credit amount — increases what factory owes the supplier (purchases, adjustments)",
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiPropertyOptional({ example: "Paid via cash on site visit" })
  @IsOptional()
  @IsString()
  notes?: string;
}
