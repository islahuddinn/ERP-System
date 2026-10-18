import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { ContractStatus, ContractType } from "@prisma/tenant-client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class ContractFiltersDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by employee ID" })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional({ enum: ContractStatus, description: "Filter by contract status" })
  @IsOptional()
  @IsEnum(ContractStatus)
  status?: ContractStatus;

  @ApiPropertyOptional({ enum: ContractType, description: "Filter by contract type" })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @ApiPropertyOptional({ description: "Filter by department ID" })
  @IsOptional()
  @IsString()
  departmentId?: string;
}
