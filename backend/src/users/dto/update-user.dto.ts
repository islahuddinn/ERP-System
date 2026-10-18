import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsEmail } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: "Doe" })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: "user@example.com" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "+1234567890" })
  @IsOptional()
  @IsString()
  phone?: string;
}
