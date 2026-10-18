import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { POApprovalStatus } from "@prisma/tenant-client";

export class DecidePoApprovalDto {
  @ApiProperty({
    enum: [POApprovalStatus.APPROVED, POApprovalStatus.REJECTED],
    example: POApprovalStatus.APPROVED,
  })
  @IsIn([POApprovalStatus.APPROVED, POApprovalStatus.REJECTED])
  decision: typeof POApprovalStatus.APPROVED | typeof POApprovalStatus.REJECTED;

  @ApiPropertyOptional({ example: "Looks good, approved." })
  @IsOptional()
  @IsString()
  remarks?: string;
}
