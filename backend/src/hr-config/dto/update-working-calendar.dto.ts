import { PartialType } from "@nestjs/swagger";
import { CreateWorkingCalendarDto } from "./create-working-calendar.dto";

export class UpdateWorkingCalendarDto extends PartialType(CreateWorkingCalendarDto) {}

