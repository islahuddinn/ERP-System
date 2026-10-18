import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { AuditAction, AuditModule } from "@prisma/tenant-client";
import { PaginationDto } from "../../common/dto/pagination.dto";

export class FilterAuditLogsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AuditModule })
  @IsOptional()
  @IsEnum(AuditModule)
  module?: AuditModule;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: "Start date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: "End date (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
