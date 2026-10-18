import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { BranchLedgerEntryType } from "../utils/enums";

// No branchId filter — the ledger always shows what's visible from the
// caller's own branch (itself, and its descendants in FIXED_PRICE mode).
// Letting a caller pass an arbitrary branchId would be exactly the kind of
// hole that breaks the "one hop only" visibility rule.
export class BranchLedgerFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: BranchLedgerEntryType })
  @IsOptional()
  @IsEnum(BranchLedgerEntryType)
  type?: BranchLedgerEntryType;
}
