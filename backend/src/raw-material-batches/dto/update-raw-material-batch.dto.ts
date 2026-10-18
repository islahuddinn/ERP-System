import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import { RawMaterialBatchStatus } from "@prisma/tenant-client";

export const MANUALLY_SETTABLE_BATCH_STATUSES = [
  RawMaterialBatchStatus.BLOCKED,
  RawMaterialBatchStatus.QUARANTINE,
] as const;

export class UpdateRawMaterialBatchDto {
  @ApiPropertyOptional({
    enum: MANUALLY_SETTABLE_BATCH_STATUSES,
    description:
      "Manual status override. Only BLOCKED (hold) or QUARANTINE (send back for re-inspection) " +
      "are allowed — ACTIVE/PARTIAL/CONSUMED are derived from quantity and EXPIRED is set by the expiry job.",
  })
  @IsOptional()
  @IsIn(MANUALLY_SETTABLE_BATCH_STATUSES)
  status?: (typeof MANUALLY_SETTABLE_BATCH_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
