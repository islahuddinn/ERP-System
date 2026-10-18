import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsNotEmpty } from "class-validator";
import { ReturnStatus } from "@prisma/tenant-client";

export class UpdateReturnStatusDto {
  @ApiProperty({ enum: ReturnStatus, example: ReturnStatus.APPROVED })
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @ApiPropertyOptional({ example: "Items within acceptable tolerance" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reason?: string;
}
