import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum } from "class-validator";
import { SaleStatus } from "@prisma/tenant-client";

export class UpdateSaleStatusDto {
  @ApiProperty({
    example: "COMPLETED",
    enum: SaleStatus,
    description: "New sale status",
  })
  @IsEnum(SaleStatus)
  status: SaleStatus;

  @ApiProperty({
    example: "Customer requested cancellation",
    description: "Reason for status change",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
