import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class CreateCompanyDto {
  @ApiProperty({
    example: "Tech Solutions Inc.",
    description: "Company name (must be unique)",
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @MinLength(2, { message: "Company name must be at least 2 characters long" })
  @MaxLength(100, { message: "Company name must not exceed 100 characters" })
  name: string;

  @ApiProperty({
    example: "TECH001",
    description: "Company code (optional, unique identifier)",
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "Company code must not exceed 50 characters" })
  code?: string;
}
