import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsUUID } from "class-validator";

export class AssignPermissionsDto {
  @ApiProperty({
    description: "Permission IDs to assign to this role (replaces all existing permissions)",
    type: [String],
  })
  @IsArray()
  @IsUUID("all", { each: true })
  permissionIds: string[];
}
