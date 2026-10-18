import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateEmployeeCashTransferDto {
  @ApiProperty({ description: "Employee receiving the cash (e.g. branch manager, HR/finance)" })
  @IsUUID()
  toEmployeeId: string;

  @ApiProperty({ description: "Amount being handed over" })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({
    description:
      "Set only when this transfer is paying down the debt for one specific branch stock transfer — I must be that transfer's own toBranch distributor, and the recipient must be whoever dispatched it. Once the receiver confirms, this credits that transfer's ledger balance automatically.",
  })
  @IsOptional()
  @IsUUID()
  settlesTransferId?: string;

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
