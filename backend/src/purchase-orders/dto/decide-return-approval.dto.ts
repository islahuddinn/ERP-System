import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { ReturnApprovalStatus } from "@prisma/tenant-client";

export class DecideReturnApprovalDto {
  @ApiProperty({
    enum: [ReturnApprovalStatus.APPROVED, ReturnApprovalStatus.REJECTED],
    example: ReturnApprovalStatus.APPROVED,
  })
  @IsIn([ReturnApprovalStatus.APPROVED, ReturnApprovalStatus.REJECTED])
  decision: typeof ReturnApprovalStatus.APPROVED | typeof ReturnApprovalStatus.REJECTED;

  @ApiPropertyOptional({ example: "Looks good, approved." })
  @IsOptional()
  @IsString()
  remarks?: string;
}
