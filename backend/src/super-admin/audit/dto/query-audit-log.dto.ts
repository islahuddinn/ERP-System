// dto/query-audit-log.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { SuperAdminAuditEntityType, SuperAdminAuditAction } from "@prisma/master-client";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class QueryAuditLogDto {
  @ApiPropertyOptional({
    enum: SuperAdminAuditEntityType,
    default: SuperAdminAuditEntityType.TENANT,
  })
  @IsOptional()
  @IsEnum(SuperAdminAuditEntityType)
  entityType?: SuperAdminAuditEntityType;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({
    enum: SuperAdminAuditAction,
    default: SuperAdminAuditAction.UPDATED,
  })
  @IsOptional()
  @IsEnum(SuperAdminAuditAction)
  action?: SuperAdminAuditAction;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  actorId?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  fromDate?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  toDate?: string;
}
