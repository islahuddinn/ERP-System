import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ExpenseStatus } from "@prisma/tenant-client";

export class ApproveExpenseDto {
  @ApiProperty({ enum: ExpenseStatus, example: "APPROVED" })
  @IsEnum(ExpenseStatus)
  status: ExpenseStatus;

  @ApiProperty({ example: "Expense approved", required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
