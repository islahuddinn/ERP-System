import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { Transform } from "class-transformer";
import { TenantStatus } from "@prisma/master-client";

export class CreateTenantDto {
  // -------------------------
  // BASIC INFO
  // -------------------------

  @ApiProperty({ example: "acme-corp" })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  name: string;

  @ApiProperty({ example: "admin@acme.com" })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @ApiPropertyOptional({ example: "+923001112233" })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: "Lahore, Pakistan" })
  @IsOptional()
  @IsString()
  address?: string;

  // -------------------------
  // TENANT IDENTIFIERS
  // -------------------------

  @ApiPropertyOptional({ example: "acme" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  subdomain?: string;

  @ApiPropertyOptional({ example: "acm123" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim().toLowerCase())
  shortTenantId?: string;

  // -------------------------
  // SYSTEM CONTROL (IMPORTANT)
  // -------------------------

  @ApiProperty({ enum: TenantStatus, default: TenantStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus = TenantStatus.ACTIVE;

  @ApiPropertyOptional({
    example: "req_20260519_abc123",
    description: "Idempotency key for safe retries",
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  // -------------------------
  // ADMIN USER CREATION
  // -------------------------

  @ApiProperty({ example: "admin@acme.com" })
  @IsEmail()
  @IsNotEmpty()
  adminEmail: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  adminPassword: string;

  // -------------------------
  // OPTIONAL BUSINESS CONFIG
  // -------------------------

  @ApiPropertyOptional({ example: "Acme Pvt Ltd" })
  @IsOptional()
  @IsString()
  brandingName?: string;

  @ApiPropertyOptional({ example: "https://cdn.com/logo.png" })
  @IsOptional()
  @IsString()
  brandingLogoUrl?: string;
}
