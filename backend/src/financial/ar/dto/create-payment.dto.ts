import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePaymentAllocationDto {
  @ApiProperty({ description: "Invoice ID" })
  @IsString()
  @IsNotEmpty()
  invoiceId: string;

  @ApiProperty({ description: "Allocated amount" })
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class CreatePaymentDto {
  @ApiProperty({ description: "Customer ID" })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: "Payment amount" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ description: "Payment method (e.g. CASH, BANK)" })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: "Customer bank account ID (optional)", required: false })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiProperty({
    description: "Payment date",
    required: false,
    type: String,
  })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  paymentDate?: Date;

  @ApiProperty({
    description: "Payment allocations against invoices",
    type: [CreatePaymentAllocationDto],
  })
  @IsArray()
  @IsNotEmpty()
  allocations: CreatePaymentAllocationDto[];
}

