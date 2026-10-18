import { IsString, MinLength, Matches } from "class-validator";

export class SuperAdminUpdatePasswordDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @Matches(/^(?=.*[A-Z])(?=.*[0-9]).{6,}$/, {
    message: "Password must contain at least 1 uppercase letter and 1 number",
  })
  newPassword: string;
}
