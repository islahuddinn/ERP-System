import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, Length } from "class-validator";
import { Transform } from "class-transformer";

export class LoginDto {
  @ApiProperty({ example: "admin@acme.com" })
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: "SecurePass123!" })
  @IsString()
  password: string;

  @ApiProperty({
    example: "1554",
    required: false,
    description: "Tenant identifier",
  })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Transform(({ value }) => value?.trim())
  tenantId?: string;
}
