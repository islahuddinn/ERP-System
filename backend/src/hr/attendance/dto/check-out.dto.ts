import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, Matches } from "class-validator";
import { AttendanceHelper } from "../utils/attendance.helper";

export class CheckOutDto {
  @ApiProperty({ description: "Check-out time (HH:MM, 24-hour format)" })
  @IsNotEmpty()
  @Matches(AttendanceHelper.TIME_FORMAT_REGEX, { message: AttendanceHelper.TIME_FORMAT_MESSAGE })
  checkOut: string;
}
