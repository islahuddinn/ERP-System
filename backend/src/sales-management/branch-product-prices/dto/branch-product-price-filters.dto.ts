import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class BranchProductPriceFiltersDto extends PaginationDto {
  @ApiPropertyOptional({
    description: "Seller whose price list to view. Omit to view the Factory's price list.",
  })
  @IsOptional()
  @IsUUID()
  sellerBranchId?: string;
}
