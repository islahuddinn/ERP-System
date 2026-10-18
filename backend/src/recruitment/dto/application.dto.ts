import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { ApplicationStage } from "./recruitment.enums";

export class CreateApplicationDto {
  @ApiProperty({ description: "Candidate ID" })
  @IsUUID()
  candidateId: string;

  @ApiProperty({ description: "Job requisition ID" })
  @IsUUID()
  requisitionId: string;

  @ApiProperty({ description: "Application notes" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateApplicationDto {
  @ApiProperty({ enum: ApplicationStage, description: "Application stage" })
  @IsEnum(ApplicationStage)
  @IsOptional()
  stage?: ApplicationStage;

  @ApiProperty({ description: "Application status" })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiProperty({ description: "Application notes" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateApplicationStageDto {
  @ApiProperty({ enum: ApplicationStage, description: "New application stage" })
  @IsEnum(ApplicationStage)
  stage: ApplicationStage;

  @ApiProperty({ description: "Notes for stage change" })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ListApplicationsDto {
  @ApiProperty({ description: "Filter by candidate ID" })
  @IsUUID()
  @IsOptional()
  candidateId?: string;

  @ApiProperty({ description: "Filter by requisition ID" })
  @IsUUID()
  @IsOptional()
  requisitionId?: string;

  @ApiProperty({ enum: ApplicationStage, description: "Filter by stage" })
  @IsEnum(ApplicationStage)
  @IsOptional()
  stage?: ApplicationStage;

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
