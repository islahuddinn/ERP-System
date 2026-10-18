import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateBankAccountDto {
  @ApiProperty({ description: "Bank account name" })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiProperty({ description: "Currency code (e.g. USD)" })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({
    description: "Opening balance",
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance?: number;
}

