import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { LoginAccess } from "@prisma/tenant-client";

export class ChangeUserStatusDto {
  @ApiProperty({ enum: LoginAccess })
  @IsEnum(LoginAccess)
  loginAccess: LoginAccess;
}
