import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { EmployeeCashTransferStatus } from "@prisma/tenant-client";

export class RespondToEmployeeCashTransferDto {
  @ApiProperty({
    enum: [EmployeeCashTransferStatus.RECEIVED, EmployeeCashTransferStatus.REJECTED],
    description: "The receiving employee's decision — confirm they got the cash, or reject it",
  })
  @IsIn([EmployeeCashTransferStatus.RECEIVED, EmployeeCashTransferStatus.REJECTED])
  decision: EmployeeCashTransferStatus;

  @ApiPropertyOptional({ description: "Receiver's comment (e.g. reason for rejecting)" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
