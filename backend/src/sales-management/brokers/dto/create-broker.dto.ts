import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { BrokerStatus } from "@prisma/tenant-client";

export class CreateBrokerDto {
  @ApiProperty({ description: "Broker display name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Optional unique code; generated as BR-0001 when omitted" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  brokerCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((dto) => dto.email && dto.email.trim() !== "")
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  address?: string;

  @ApiPropertyOptional({ description: "Sales territory label or area id" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  areaId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionRate?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  salesTarget?: number;

  @ApiPropertyOptional({ enum: BrokerStatus, default: BrokerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BrokerStatus)
  status?: BrokerStatus;
}
