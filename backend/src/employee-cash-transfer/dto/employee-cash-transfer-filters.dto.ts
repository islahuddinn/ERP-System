import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class EmployeeCashTransferFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by sending employee" })
  @IsOptional()
  @IsUUID()
  fromEmployeeId?: string;

  @ApiPropertyOptional({ description: "Filter by receiving employee" })
  @IsOptional()
  @IsUUID()
  toEmployeeId?: string;
}
