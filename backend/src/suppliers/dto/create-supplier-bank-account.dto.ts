import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class CreateSupplierBankAccountDto {
  @ApiProperty({ example: "HBL" })
  @IsString()
  @MinLength(1)
  bankName: string;

  @ApiProperty({ example: "Al-Habib Traders" })
  @IsString()
  @MinLength(1)
  accountTitle: string;

  @ApiProperty({ example: "01234567890" })
  @IsString()
  @MinLength(1)
  accountNumber: string;

  @ApiPropertyOptional({ example: "PK36SCBL0000001123456702" })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ example: "HABBPKKA" })
  @IsOptional()
  @IsString()
  swiftCode?: string;

  @ApiPropertyOptional({ example: "PKR", default: "PKR" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
