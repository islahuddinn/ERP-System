import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { EmployeeStatus } from "@prisma/tenant-client";
import { PaginationDto } from "src/common/dto/pagination.dto";

export class EmployeeFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ enum: EmployeeStatus, description: "Filter by employee status" })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}
