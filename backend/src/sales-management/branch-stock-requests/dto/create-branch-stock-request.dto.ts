import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { BranchStockRequestItemDto } from "./branch-stock-request-item.dto";

/**
 * No requesterBranchId or fulfillerBranchId in the body — the requester is
 * always the caller's own branch, and the fulfiller is always that branch's
 * parent (or the Factory, if it has none). Both are resolved server-side so
 * a request can never be spoofed against a branch the caller doesn't run.
 */
export class CreateBranchStockRequestDto {
  @ApiProperty({ type: [BranchStockRequestItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "A request must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => BranchStockRequestItemDto)
  items: BranchStockRequestItemDto[];

  @ApiPropertyOptional({ description: "Optional notes" })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  notes?: string;
}
