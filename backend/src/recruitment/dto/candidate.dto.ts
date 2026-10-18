import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateCandidateDto {
  @ApiProperty({ description: "First name" })
  @IsString()
  firstName: string;

  @ApiProperty({ description: "Last name" })
  @IsString()
  lastName: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Phone number" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: "Resume URL" })
  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @ApiProperty({ description: "Source of candidate" })
  @IsString()
  @IsOptional()
  source?: string;
}

export class UpdateCandidateDto {
  @ApiProperty({ description: "First name" })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: "Last name" })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: "Email address" })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: "Phone number" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: "Resume URL" })
  @IsString()
  @IsOptional()
  resumeUrl?: string;

  @ApiProperty({ description: "Source of candidate" })
  @IsString()
  @IsOptional()
  source?: string;
}

export class ListCandidatesDto {
  @ApiProperty({ description: "Search query" })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({ description: "Filter by source" })
  @IsString()
  @IsOptional()
  source?: string;

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
