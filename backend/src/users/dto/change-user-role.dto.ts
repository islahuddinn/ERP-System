import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class ChangeUserRoleDto {
  @ApiProperty({ description: "Role ID to assign to this user" })
  @IsUUID()
  roleId: string;
}
