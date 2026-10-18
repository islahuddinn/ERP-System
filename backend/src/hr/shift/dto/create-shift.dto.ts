import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ShiftType } from "@prisma/tenant-client";
import { Transform } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from "class-validator";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateShiftDto {
  @ApiProperty({ description: "Shift name e.g. Morning Shift" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ description: "Optional description" })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @MaxLength(256)
  description?: string;

  @ApiProperty({
    enum: ShiftType,
    description: "FIXED tracks late arrivals; FLEXIBLE only checks total hours",
  })
  @IsEnum(ShiftType)
  type: ShiftType;

  @ApiProperty({ description: 'Clock-in time in 24-hr format e.g. "10:00"' })
  @IsString()
  @Matches(TIME_REGEX, { message: "startTime must be HH:MM in 24-hour format" })
  startTime: string;

  @ApiProperty({ description: 'Clock-out time in 24-hr format e.g. "19:00"' })
  @IsString()
  @Matches(TIME_REGEX, { message: "endTime must be HH:MM in 24-hour format" })
  endTime: string;

  @ApiPropertyOptional({
    description: "Set true when the shift spans midnight e.g. 22:00–06:00",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  crossesMidnight?: boolean;

  @ApiPropertyOptional({
    description:
      "FIXED only — minutes of grace after startTime before marking late. " +
      "null means not explicitly set, distinct from an explicit 0 (no grace allowed).",
    default: 0,
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  graceMinutes?: number | null;

  @ApiPropertyOptional({
    description: "Unpaid break minutes within the shift, excluded from required work time",
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  breakMinutes?: number;
}
