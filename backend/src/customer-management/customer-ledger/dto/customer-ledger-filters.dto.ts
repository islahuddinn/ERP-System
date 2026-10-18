import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

// Note: `sortBy`/`sortOrder` from PaginationDto are intentionally not honored
// by the repository — a ledger's running balance is only meaningful in
// chronological order, so entries are always returned oldest-first.
export class CustomerLedgerFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ example: "2026-01-01", description: "Start date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: "2026-12-31", description: "End date (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
