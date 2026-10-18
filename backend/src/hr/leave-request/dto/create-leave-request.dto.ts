import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LeaveDurationType } from "@prisma/tenant-client";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from "class-validator";

export class CreateLeaveRequestDto {
  @ApiProperty({ description: "Employee this leave request is for" })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: "Leave start date (YYYY-MM-DD)" })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({
    description: "Leave end date (YYYY-MM-DD) — required for FULL_DAY, ignored for HALF_DAY",
  })
  @ValidateIf(
    (createLeaveRequestDto: CreateLeaveRequestDto) =>
      createLeaveRequestDto.durationType !== LeaveDurationType.HALF_DAY,
  )
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: LeaveDurationType,
    default: LeaveDurationType.FULL_DAY,
    description:
      "HALF_DAY always applies to a single date — endDate is ignored and set to startDate",
  })
  @IsOptional()
  @IsEnum(LeaveDurationType)
  durationType?: LeaveDurationType;

  @ApiPropertyOptional({
    default: true,
    description:
      "Paid leave deducts from the employee's active contract leave balance on approval; unpaid leave does not",
  })
  @IsOptional()
  @IsBoolean()
  isPaid?: boolean;

  @ApiPropertyOptional({ description: "Reason for the leave request" })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  reason?: string;

  @ApiProperty({
    type: [String],
    description: "User ID(s) who must approve this leave request — at least one required",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  approverIds: string[];
}
