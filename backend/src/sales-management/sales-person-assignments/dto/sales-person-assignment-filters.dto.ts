import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class SalesPersonAssignmentFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by branch" })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
