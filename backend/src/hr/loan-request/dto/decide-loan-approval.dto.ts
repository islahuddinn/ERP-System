import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { LoanApprovalStatus } from "@prisma/tenant-client";

export class DecideLoanApprovalDto {
  @ApiProperty({
    enum: [LoanApprovalStatus.PENDING, LoanApprovalStatus.APPROVED, LoanApprovalStatus.REJECTED],
    example: LoanApprovalStatus.APPROVED,
    description:
      "The approver's decision. Can be changed later (including back to PENDING) as long as the loan request has not been fully approved yet.",
  })
  @IsIn([LoanApprovalStatus.PENDING, LoanApprovalStatus.APPROVED, LoanApprovalStatus.REJECTED])
  decision: LoanApprovalStatus;

  @ApiPropertyOptional({ example: "Approved, will be disbursed shortly." })
  @IsOptional()
  @IsString()
  remarks?: string;
}
