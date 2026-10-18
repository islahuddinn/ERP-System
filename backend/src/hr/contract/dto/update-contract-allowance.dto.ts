import { ApiProperty } from "@nestjs/swagger";
import { IsDecimal } from "class-validator";

export class UpdateContractAllowanceDto {
  @ApiProperty({ description: "New allowance amount" })
  @IsDecimal({ decimal_digits: "0,2" })
  amount: string;
}
