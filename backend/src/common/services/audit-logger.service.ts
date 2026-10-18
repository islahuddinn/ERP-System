import { Injectable, Logger } from "@nestjs/common";

export interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ip?: string;
  userAgent?: string;
  status?: string;
  error?: string;
  stack?: string;
}

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger("AuditLog");

  log(entry: AuditLogEntry): void {
    this.logger.log(
      JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
      }),
    );
  }

  logSuccess(entry: AuditLogEntry): void {
    this.log({ ...entry, status: "SUCCESS" });
  }

  logFailure(entry: AuditLogEntry, error: Error): void {
    this.log({
      ...entry,
      status: "FAILURE",
      error: error.message,
      stack: error.stack,
    });
  }
}
