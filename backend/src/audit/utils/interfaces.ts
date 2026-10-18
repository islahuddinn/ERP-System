import { AuditAction, AuditModule } from "@prisma/tenant-client";

export interface AuditableOptions {
  /** Module enum value, e.g. AuditModule.PRODUCTS */
  module: AuditModule;
  /** Override the entity class name stored in the log. Defaults to the module's primary entity. */
  entity?: string;
  /** Override action instead of inferring from HTTP method */
  action?: AuditAction;
  /** Fields to strip from diff/snapshot (passwords, tokens, etc.) */
  sensitiveFields?: string[];
  /** Set true on routes that should never be logged */
  skip?: boolean;
}

export interface AuditLogEntry {
  actorId: string;
  module: AuditModule;
  entityName: string;
  entityId: string;
  entityLabel?: string;
  action: AuditAction;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
}

export interface DiffResult {
  [field: string]: {
    from: any;
    to: any;
  };
}

export interface AuditContextStore {
  oldValue?: Record<string, any>;
  entityLabel?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  /** Override the inferred action — e.g. an upsert route that turned out to update an existing row */
  action?: AuditAction;
}
