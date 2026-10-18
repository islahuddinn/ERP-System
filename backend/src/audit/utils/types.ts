import { AuditAction, AuditModule } from "@prisma/tenant-client";

export enum ActorType {
  USER = "USER",
  SYSTEM = "SYSTEM",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export type AuditActionString = keyof typeof AuditAction | string;

export type FieldDiff = { from: any; to: any };

export type AuditDiff = Record<string, FieldDiff>;

export type SensitiveFieldList = readonly string[];

export type LogParams = {
  actorId: string;
  actorType?: ActorType;
  entityName: string;
  entityId: string;
  action: AuditActionString;
  oldValue?: any;
  newValue?: any;
  module?: AuditModule;
  entityLabel?: string;
  metadata?: Record<string, any>;
};

/** @deprecated Use LogParams instead */
export type LogOptions = {
  module?: AuditModule;
  entityLabel?: string;
  metadata?: Record<string, any>;
  sensitiveFields?: string[];
};

export type AuditSummary = {
  totalLogs: number;
  recentLogs: any[];
  byAction: Record<string, number>;
  byModule: Record<string, number>;
};

export type PaginatedAuditLogs = {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};
