import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { HolidayType } from "@prisma/tenant-client";
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";

const DATE_ONLY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ONLY_FORMAT_MESSAGE = "must be in YYYY-MM-DD format";

export class CreateHolidayDto {
  @ApiProperty({ description: "Holiday name e.g. Independence Day" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({ description: "Optional description" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    enum: HolidayType,
    default: HolidayType.FULL_DAY,
    description:
      "HALF_DAY always applies to a single date — endDate is ignored and set to startDate",
  })
  @IsOptional()
  @IsEnum(HolidayType)
  type?: HolidayType;

  @ApiProperty({ description: "Holiday start date (YYYY-MM-DD)" })
  @IsDateString({ strict: true }, { message: `startDate ${DATE_ONLY_FORMAT_MESSAGE}` })
  @Matches(DATE_ONLY_FORMAT, { message: `startDate ${DATE_ONLY_FORMAT_MESSAGE}` })
  startDate: string;

  @ApiPropertyOptional({
    description: "Holiday end date (YYYY-MM-DD) — required for FULL_DAY, ignored for HALF_DAY",
  })
  @ValidateIf(
    (createHolidayDto: CreateHolidayDto) => createHolidayDto.type !== HolidayType.HALF_DAY,
  )
  @IsDateString({ strict: true }, { message: `endDate ${DATE_ONLY_FORMAT_MESSAGE}` })
  @Matches(DATE_ONLY_FORMAT, { message: `endDate ${DATE_ONLY_FORMAT_MESSAGE}` })
  endDate?: string;
}
