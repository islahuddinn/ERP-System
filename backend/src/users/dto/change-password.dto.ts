import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ChangePasswordDto {
  @ApiProperty({ example: "currentPassword123", description: "Current password" })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: "newSecurePassword123", minLength: 8, description: "New password" })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
