import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { PaymentMethod, RecurringFrequency } from "@prisma/tenant-client";

export class CreateExpenseDto {
  @ApiProperty({ example: "uuid-of-category" })
  @IsString()
  categoryId: string;

  @ApiProperty({ example: "uuid-of-location" })
  @IsString()
  locationId: string;

  @ApiProperty({ example: 5000.0, minimum: 0.01 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({
    example: "CASH",
    enum: PaymentMethod,
    description: "Payment method",
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  paymentDate: string;

  @ApiProperty({ example: "2025-01-15" })
  @IsDateString()
  expenseDate: string;

  @ApiProperty({ example: "Monthly office rent payment", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: "ABC Real Estate", required: false })
  @IsOptional()
  @IsString()
  vendor?: string;

  @ApiProperty({ example: "INV-2025-001", required: false })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiProperty({
    example: "MONTHLY",
    enum: RecurringFrequency,
    required: false,
  })
  @IsOptional()
  @IsEnum(RecurringFrequency)
  recurringFrequency?: RecurringFrequency;

  @ApiProperty({
    example: ["https://cloudinary.com/receipt1.jpg"],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}
