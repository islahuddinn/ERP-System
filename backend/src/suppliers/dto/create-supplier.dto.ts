import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNotEmpty,
  ValidateIf,
  ValidateNested,
  IsNumber,
  IsDateString,
  Min,
  Matches,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class SupplierOpeningBalanceDto {
  @ApiPropertyOptional({
    example: 10000,
    description:
      "Opening balance amount. Must be a non-negative number. Omit (or send an empty openingBalance object) to clear the balance on update.",
  })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "Opening balance amount cannot be negative" })
  amount?: number;

  @ApiPropertyOptional({ example: "2025-11-15" })
  @IsOptional()
  @IsDateString()
  @Matches(/^(19|20)\d{2}-\d{2}-\d{2}$/, { message: "date must be a valid date between 1900-2099" })
  date?: string;

  @ApiPropertyOptional({ example: "Migrated from old ERP" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ example: "Al-Habib Traders" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "Supplier name is required" })
  name: string;

  @ApiPropertyOptional({ example: "supplier@example.com" })
  @IsOptional()
  @ValidateIf((o) => o.email && o.email.trim() !== "")
  @IsEmail({}, { message: "Please provide a valid email address" })
  email?: string;

  @ApiPropertyOptional({ example: "+92-300-1234567" })
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @ValidateIf((o) => o.phone && o.phone.trim() !== "")
  @IsString()
  @Matches(/^[0-9+\-()\s]{7,20}$/, {
    message: "Phone number is invalid — use digits, spaces, and + - ( ) only (7-20 chars)",
  })
  phone?: string;

  @ApiPropertyOptional({ example: "123 Industrial Area, Lahore" })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: "Only delivers on weekdays" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description:
      "Opening balance if supplier already had a balance before entering the system",
    type: () => SupplierOpeningBalanceDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SupplierOpeningBalanceDto)
  openingBalance?: SupplierOpeningBalanceDto;
}
