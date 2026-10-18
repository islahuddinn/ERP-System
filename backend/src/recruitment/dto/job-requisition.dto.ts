import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { EmploymentType, JobRequisitionStatus } from "./recruitment.enums";

export class CreateJobRequisitionDto {
  @ApiProperty({ description: "Job title" })
  @IsString()
  title: string;

  @ApiProperty({ description: "Department ID" })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: "Position ID" })
  @IsUUID()
  positionId: string;

  @ApiProperty({ enum: EmploymentType, description: "Employment type" })
  @IsEnum(EmploymentType)
  employmentType: EmploymentType;

  @ApiProperty({ description: "Number of openings" })
  @IsInt()
  @Min(1)
  openings: number;

  @ApiProperty({ enum: JobRequisitionStatus, description: "Status" })
  @IsEnum(JobRequisitionStatus)
  @IsOptional()
  status?: JobRequisitionStatus = JobRequisitionStatus.OPEN;

  @ApiProperty({ description: "Job description" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateJobRequisitionDto {
  @ApiProperty({ description: "Job title" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: "Department ID" })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ description: "Position ID" })
  @IsUUID()
  @IsOptional()
  positionId?: string;

  @ApiProperty({ enum: EmploymentType, description: "Employment type" })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiProperty({ description: "Number of openings" })
  @IsInt()
  @Min(1)
  @IsOptional()
  openings?: number;

  @ApiProperty({ enum: JobRequisitionStatus, description: "Status" })
  @IsEnum(JobRequisitionStatus)
  @IsOptional()
  status?: JobRequisitionStatus;

  @ApiProperty({ description: "Job description" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class ListJobRequisitionsDto {
  @ApiProperty({ description: "Filter by department ID" })
  @IsUUID()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ description: "Filter by position ID" })
  @IsUUID()
  @IsOptional()
  positionId?: string;

  @ApiProperty({ enum: JobRequisitionStatus, description: "Filter by status" })
  @IsEnum(JobRequisitionStatus)
  @IsOptional()
  status?: JobRequisitionStatus;

  @ApiProperty({ enum: EmploymentType, description: "Filter by employment type" })
  @IsEnum(EmploymentType)
  @IsOptional()
  employmentType?: EmploymentType;

  @ApiProperty({ description: "Search query" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: "Page number", default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ description: "Page size", default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 20;
}
