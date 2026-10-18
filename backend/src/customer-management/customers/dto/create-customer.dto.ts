import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { CustomerType, CustomerStatus, PaymentMethod, PriceListTier } from "@prisma/tenant-client";

export class CreateCustomerDto {
  @ApiProperty({ example: "Ahmed Traders" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  shopName: string;

  @ApiPropertyOptional({ example: "Ahmed Khan" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  shopkeeperName?: string;

  @ApiProperty({ example: "+923001234567" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  phone: string;

  @ApiPropertyOptional({ example: "ahmed@traders.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: "35202-1234567-1" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cnic: string;

  @ApiProperty({ enum: CustomerType })
  @IsEnum(CustomerType)
  customerType: CustomerType;

  @ApiProperty({ description: "Customer category this customer belongs to" })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  paymentMode: PaymentMethod;

  @ApiProperty({ example: "123 Main Street, Lahore" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  address: string;

  @ApiProperty({ description: "Area this customer belongs to" })
  @IsUUID()
  areaId: string;

  @ApiPropertyOptional({ example: "Prefers delivery on Tuesdays" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiProperty({
    description:
      "Maximum outstanding balance allowed on the distribution ledger before new orders are blocked",
    example: 50000,
  })
  @IsNumber()
  @IsPositive()
  creditLimit: number;

  @ApiPropertyOptional({
    enum: PriceListTier,
    default: PriceListTier.TRADE_PRICE,
    description:
      "Which company-wide price list this shop pays — only used while the company is in FIXED_PRICE mode. Defaults to TRADE_PRICE since every customer here is a shop.",
  })
  @IsOptional()
  @IsEnum(PriceListTier)
  priceTier?: PriceListTier;
}
