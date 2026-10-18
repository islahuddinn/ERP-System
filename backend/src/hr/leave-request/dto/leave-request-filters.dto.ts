import { ApiPropertyOptional } from "@nestjs/swagger";
import { LeaveRequestStatus } from "@prisma/tenant-client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class LeaveRequestFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by employee" })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: LeaveRequestStatus, description: "Filter by status" })
  @IsOptional()
  @IsEnum(LeaveRequestStatus)
  status?: LeaveRequestStatus;
}
