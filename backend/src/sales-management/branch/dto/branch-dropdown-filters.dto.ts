import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { BranchType } from "@prisma/tenant-client";

export class BranchDropdownFiltersDto {
  @ApiPropertyOptional({ description: "Filter branches belonging to a specific city" })
  @IsOptional()
  @IsUUID()
  cityId?: string;

  @ApiPropertyOptional({
    enum: BranchType,
    description: "Filter to only Primary or only Secondary branches",
  })
  @IsOptional()
  @IsEnum(BranchType)
  type?: BranchType;
}
