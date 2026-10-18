import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { EmployeeStatus, LoginAccess } from "@prisma/tenant-client";
import { Transform } from "class-transformer";
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from "../utils/constants";

export class CreateEmployeeDto {
  @ApiProperty({ description: "Employee's first name", example: "John" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  firstName: string;

  @ApiProperty({ description: "Employee's last name", example: "Doe" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  lastName: string;

  @ApiPropertyOptional({
    description:
      "Email address — required when loginAccess is ENABLED; omit for laborers with no system access",
    example: "john.doe@example.com",
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  email?: string;

  @ApiPropertyOptional({ description: "Contact phone", example: "+92 300 1234567" })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  phone?: string;

  @ApiProperty({
    enum: LoginAccess,
    default: LoginAccess.DISABLED,
    description: "ENABLED for staff who log in; DISABLED for laborers",
    example: LoginAccess.DISABLED,
  })
  @IsNotEmpty()
  @IsEnum(LoginAccess)
  loginAccess: LoginAccess;

  @ApiPropertyOptional({
    description: "Role ID to assign — required whenever an email is provided",
    example: "8f14e45f-ceea-4e1a-9e6e-1a2b3c4d5e6f",
  })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiProperty({
    description: "Shift ID to assign",
    example: "2f9c3b1a-4d5e-4f6a-8b7c-9d0e1f2a3b4c",
  })
  @IsNotEmpty()
  @IsUUID()
  shiftId: string;

  @ApiPropertyOptional({
    description: "Password (min 6 chars) — required when loginAccess is ENABLED",
    minLength: 6,
    example: "Passw0rd!",
  })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiProperty({ description: "Unique employee code", example: "EMP-0001" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  employeeCode: string;

  @ApiProperty({ description: "Date of joining (ISO string)", example: "2026-07-15" })
  @IsDateString()
  @IsNotEmpty()
  dateOfJoining: string;

  @ApiPropertyOptional({
    enum: EmployeeStatus,
    default: EmployeeStatus.ACTIVE,
    example: EmployeeStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
