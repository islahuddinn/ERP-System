import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CancelSaleDto {
  @ApiProperty({
    example: "Customer requested cancellation",
    description: "Reason for cancellation (required)",
  })
  @IsString()
  reason: string;

  @ApiProperty({
    example: true,
    description: "Reverse stock transactions",
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  reverseStock?: boolean;

  @ApiProperty({
    example: true,
    description: "Reverse customer balance",
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  reverseCustomerBalance?: boolean;

  @ApiProperty({
    example: true,
    description: "Reverse cash transactions",
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  reverseCashTransaction?: boolean;
}
