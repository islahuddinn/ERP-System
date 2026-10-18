import { ApiPropertyOptional } from "@nestjs/swagger";
import { LoanRequestStatus } from "@prisma/tenant-client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class LoanRequestFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by employee" })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: LoanRequestStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(LoanRequestStatus)
  status?: LoanRequestStatus;
}
