import { ApiProperty } from "@nestjs/swagger";
import { IsDecimal, IsEnum } from "class-validator";
import { AllowanceType } from "@prisma/tenant-client";

export class CreateContractAllowanceDto {
  @ApiProperty({ enum: AllowanceType, description: "Type of allowance" })
  @IsEnum(AllowanceType)
  allowanceType: AllowanceType;

  @ApiProperty({ description: "Allowance amount" })
  @IsDecimal({ decimal_digits: "0,2" })
  amount: string;
}
