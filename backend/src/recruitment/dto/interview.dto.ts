import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Transform, Type } from "class-transformer";

export class CreateInterviewDto {
  @ApiProperty({ description: "Application ID" })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ description: "Interviewer ID" })
  @IsUUID()
  interviewerId: string;

  @ApiProperty({ description: "Interview date" })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  interviewDate: Date;

  @ApiProperty({ description: "Interview type" })
  @IsString()
  interviewType: string;
}

export class UpdateInterviewDto {
  @ApiProperty({ description: "Interview date" })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  interviewDate?: Date;

  @ApiProperty({ description: "Interview type" })
  @IsString()
  @IsOptional()
  interviewType?: string;

  @ApiProperty({ description: "Interview result" })
  @IsString()
  @IsOptional()
  result?: string;

  @ApiProperty({ description: "Interview feedback" })
  @IsString()
  @IsOptional()
  feedback?: string;
}

export class ListInterviewsDto {
  @ApiProperty({ description: "Filter by application ID" })
  @IsUUID()
  @IsOptional()
  applicationId?: string;

  @ApiProperty({ description: "Filter by interviewer ID" })
  @IsUUID()
  @IsOptional()
  interviewerId?: string;

  @ApiProperty({ description: "Filter by date (from)" })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  dateFrom?: Date;

  @ApiProperty({ description: "Filter by date (to)" })
  @IsDate()
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  dateTo?: Date;

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
