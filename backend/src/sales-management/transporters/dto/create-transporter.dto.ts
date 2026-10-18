import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { TransporterStatus } from "@prisma/tenant-client";

export class CreateTransporterDto {
  @ApiProperty({ description: "Unique short code for the transporter" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) => value?.trim())
  code: string;

  @ApiProperty({ description: "Transporter company or person name" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ description: "Primary contact person name" })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  contactName?: string;

  @ApiPropertyOptional({ example: "+92-300-1234567" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  phone?: string;

  @ApiPropertyOptional({ example: "transporter@example.com" })
  @IsOptional()
  @ValidateIf((dto) => dto.email && dto.email.trim() !== "")
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  email?: string;

  @ApiPropertyOptional({ example: "123 Industrial Area, Lahore" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  address?: string;

  @ApiPropertyOptional({ example: "LEA-1234" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  vehicleRegistration?: string;

  @ApiPropertyOptional({ description: "Internal notes about the transporter" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() || undefined : value))
  notes?: string;

  @ApiPropertyOptional({ enum: TransporterStatus, default: TransporterStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TransporterStatus)
  status?: TransporterStatus;
}
