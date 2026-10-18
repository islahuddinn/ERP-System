import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, isNotEmpty, IsString, MinLength } from "class-validator";

export class SuperAdminLoginDto {
  @ApiProperty({ example: "superadmin@malindtech.com" })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => {
    const v = value?.trim();
    return v ? v.toLowerCase() : null;
  })
  email: string;

  @ApiProperty({ example: "superadmin123" })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
