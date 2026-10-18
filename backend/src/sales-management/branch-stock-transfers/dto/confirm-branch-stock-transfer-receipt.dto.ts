import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { ConfirmBranchStockTransferReceiptItemDto } from "./confirm-branch-stock-transfer-receipt-item.dto";

/**
 * Every item on the transfer must be accounted for — the caller states how
 * much of each actually arrived, even if it's the full shipped amount. No
 * silent defaulting to "fully received" for an item left out of the list,
 * so a forgotten line can never slip through as a full receipt.
 */
export class ConfirmBranchStockTransferReceiptDto {
  @ApiProperty({ type: [ConfirmBranchStockTransferReceiptItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one item's received quantity must be provided" })
  @ValidateNested({ each: true })
  @Type(() => ConfirmBranchStockTransferReceiptItemDto)
  items: ConfirmBranchStockTransferReceiptItemDto[];
}
