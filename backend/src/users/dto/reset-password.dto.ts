import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({
    example: "newSecurePassword123",
    minLength: 8,
    description: "New password for the user",
  })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
