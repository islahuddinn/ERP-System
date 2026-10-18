import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { LeaveApprovalStatus } from "@prisma/tenant-client";

export class DecideLeaveApprovalDto {
  @ApiProperty({
    enum: [LeaveApprovalStatus.PENDING, LeaveApprovalStatus.APPROVED, LeaveApprovalStatus.REJECTED],
    example: LeaveApprovalStatus.APPROVED,
    description:
      "The approver's decision. Can be changed later (including back to PENDING) as long as the leave request has not been fully approved yet.",
  })
  @IsIn([LeaveApprovalStatus.PENDING, LeaveApprovalStatus.APPROVED, LeaveApprovalStatus.REJECTED])
  decision: LeaveApprovalStatus;

  @ApiPropertyOptional({ example: "Approved, enjoy your leave." })
  @IsOptional()
  @IsString()
  remarks?: string;
}
