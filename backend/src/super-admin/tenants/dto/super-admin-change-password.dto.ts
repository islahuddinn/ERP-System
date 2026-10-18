import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class SuperAdminChangePasswordDto {
  @ApiProperty({ example: "NewSecurePassword1!" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
