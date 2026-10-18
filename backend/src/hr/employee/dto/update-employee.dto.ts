import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength } from "class-validator";
import { CreateEmployeeDto } from "./create-employee.dto";
import { PHONE_ERROR_MESSAGE, PHONE_REGEX } from "../utils/constants";

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional({
    description: "Shift ID to assign to this employee. Pass null to remove the shift assignment.",
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  shiftId?: string | null;

  // #19 — re-declare phone here (not just inherited from PartialType) so the
  // format rule is explicit on the update path too.
  @ApiPropertyOptional({ description: "Contact phone", example: "+92 300 1234567" })
  @IsOptional()
  @IsString()
  @Matches(PHONE_REGEX, { message: PHONE_ERROR_MESSAGE })
  phone?: string;

  // #12 — re-declare email as explicitly nullable: pass null to clear it (e.g. a
  // laborer's email was entered by mistake). The service checks "!== undefined"
  // so null reaches the DB update instead of being silently skipped.
  @ApiPropertyOptional({
    description: "Email address. Pass null to clear — omit the field to leave it unchanged.",
    nullable: true,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(128)
  email?: string | null;
}
