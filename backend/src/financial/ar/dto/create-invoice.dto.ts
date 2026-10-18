import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  Min,
  IsString,
} from "class-validator";

export class CreateInvoiceDto {
  @ApiProperty({ description: "Customer ID" })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ description: "Invoice date" })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  invoiceDate: Date;

  @ApiProperty({ description: "Due date" })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @ApiProperty({ description: "Total invoice amount" })
  @IsNumber()
  @Min(0.01)
  totalAmount: number;
}

