import { IsOptional, IsString, IsEnum } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { SaleDispatchStatus } from "@prisma/tenant-client";

export class UpdateSaleDispatchDto {
  @ApiPropertyOptional({
    enum: [SaleDispatchStatus.APPROVED, SaleDispatchStatus.DRAFT, SaleDispatchStatus.DELIVERED],
    description: "DRAFT→APPROVED (approve), APPROVED→DRAFT (reject), APPROVED→DELIVERED",
  })
  @IsOptional()
  @IsEnum(SaleDispatchStatus)
  status?: SaleDispatchStatus;

  @ApiPropertyOptional({ description: "User ID of the person physically handling the dispatch" })
  @IsOptional()
  @IsString()
  dispatchOfficerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
