import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class SuperAdminBootstrapDto {
  @ApiProperty({ example: "superadmin@malindtech.com" })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => {
    const v = value?.trim();
    return v ? v.toLowerCase() : null;
  })
  email: string;

  @ApiProperty({ example: "ChangeMe123!" })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: "Platform Admin" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "Must match SUPER_ADMIN_BOOTSTRAP_KEY on the server" })
  @IsNotEmpty()
  @IsString()
  bootstrapKey: string;
}
