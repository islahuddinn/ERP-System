import {
  IsString,
  IsDate,
  IsNumber,
  IsArray,
  IsNotEmpty,
} from "class-validator";
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateBillItemDto {
  @ApiProperty({ description: 'Item description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Item quantity' })
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Unit price' })
  @IsNumber()
  @IsNotEmpty()
  unitPrice: number;
}

export class CreateBillDto {
  @ApiProperty({ description: 'Vendor ID' })
  @IsString()
  @IsNotEmpty()
  vendorId: string;

  @ApiProperty({ description: 'Bill date' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  billDate: Date;

  @ApiProperty({ description: 'Due date' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;

  @ApiProperty({ description: 'Bill items', type: [CreateBillItemDto] })
  @IsArray()
  @IsNotEmpty()
  items: CreateBillItemDto[];
}
