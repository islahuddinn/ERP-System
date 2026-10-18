import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  IsNotEmpty,
  IsOptional,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreatePaymentAllocationDto {
  @ApiProperty({ description: "Bill ID" })
  @IsString()
  @IsNotEmpty()
  billId: string;

  @ApiProperty({ description: "Allocation amount" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;
}

export class CreatePaymentDto {
  @ApiProperty({ description: "Vendor ID" })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ description: "Payment amount" })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: "Payment method" })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: "Supplier bank account ID (optional)", required: false })
  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @ApiProperty({ description: "Payment allocations", type: [CreatePaymentAllocationDto] })
  @IsArray()
  @IsNotEmpty()
  allocations: CreatePaymentAllocationDto[];
}
