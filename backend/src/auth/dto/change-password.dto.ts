import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "CurrentPassword1!" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: "NewSecurePassword1!" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
