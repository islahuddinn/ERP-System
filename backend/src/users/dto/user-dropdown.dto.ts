import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class UserDropdownDto {
  @ApiPropertyOptional({ description: "Filter users by role ID" })
  @IsOptional()
  @IsUUID()
  roleId?: string;
}
