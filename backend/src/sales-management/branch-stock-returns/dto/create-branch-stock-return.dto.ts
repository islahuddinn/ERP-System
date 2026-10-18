import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { BranchStockReturnItemDto } from "./branch-stock-return-item.dto";

/**
 * No returningBranchId/receivingBranchId in the body — both are resolved
 * server-side from the referenced transfer (returningBranchId is always its
 * toBranchId, receivingBranchId is always its fromBranchId) so a return can
 * never be spoofed against a transfer the caller's branch didn't receive.
 */
export class CreateBranchStockReturnDto {
  @ApiProperty({ description: "The RECEIVED transfer this return is against" })
  @IsUUID()
  @IsNotEmpty()
  transferId: string;

  @ApiProperty({ type: [BranchStockReturnItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "A return must have at least one item" })
  @ValidateNested({ each: true })
  @Type(() => BranchStockReturnItemDto)
  items: BranchStockReturnItemDto[];

  @ApiProperty({ description: "Why this stock is being returned" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  @Transform(({ value }) => value?.trim())
  reason: string;
}
