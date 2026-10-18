import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { CreateBranchStockRequestTransferItemDto } from "./create-branch-stock-request-transfer-item.dto";

/**
 * A subset of the request's items is fine here, unlike confirm-receipt —
 * leaving an item out is exactly how "not sending that one this round" is
 * expressed for an installment delivery.
 */
export class CreateBranchStockRequestTransferDto {
  @ApiProperty({ type: [CreateBranchStockRequestTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1, { message: "At least one item must be included in this shipment" })
  @ValidateNested({ each: true })
  @Type(() => CreateBranchStockRequestTransferItemDto)
  items: CreateBranchStockRequestTransferItemDto[];
}
