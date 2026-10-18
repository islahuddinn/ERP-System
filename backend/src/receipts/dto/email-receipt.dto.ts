import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsBoolean } from "class-validator";

export class EmailReceiptDto {
  @ApiProperty({
    example: "customer@example.com",
    description: "Email address to send receipt to",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  emailAddress: string;

  @ApiProperty({
    example: true,
    description: "Include customer copy in email",
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeCustomerCopy?: boolean;
}
