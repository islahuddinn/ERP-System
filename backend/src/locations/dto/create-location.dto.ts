import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty, IsEmail, IsNumber, Matches } from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateLocationDto {
  @ApiProperty({ example: "Main Warehouse" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: "name should not be empty" })
  name: string;

  @ApiPropertyOptional({ example: "123 Main Street" })
  @IsOptional()
  // #24 — preserve an explicit null/empty so clearing the Address persists
  // (the column is nullable), instead of being omitted and leaving the old value.
  @Transform(({ value }) => (value === null ? null : typeof value === "string" ? value.trim() : value))
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ example: "Karachi" })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value?.trim() || undefined))
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: "Sindh" })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value?.trim() || undefined))
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: "Pakistan" })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value?.trim() || undefined))
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: "+92-21-1234567" })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value?.trim() || undefined))
  @IsString()
  // #23 — validate phone format when provided (digits, +, -, (), spaces).
  @Matches(/^[0-9+\-()\s]{7,20}$/, { message: "Phone number is invalid" })
  phone?: string;

  @ApiPropertyOptional({ example: "location@company.com" })
  @IsOptional()
  @Transform(({ value }) => (value === null ? null : value?.trim().toLowerCase() || undefined))
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 24.8607 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 67.0011 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}
