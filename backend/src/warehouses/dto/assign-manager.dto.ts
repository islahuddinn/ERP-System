import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AssignManagerDto {
  @ApiProperty({ description: "User ID of the manager to assign" })
  @IsString()
  @IsNotEmpty()
  managerId: string;
}
