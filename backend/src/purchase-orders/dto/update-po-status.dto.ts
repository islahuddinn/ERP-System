import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { PurchaseStatus } from "@prisma/tenant-client";

export class UpdatePoStatusDto {
  @ApiProperty({ enum: PurchaseStatus })
  @IsEnum(PurchaseStatus)
  status: PurchaseStatus;
}
