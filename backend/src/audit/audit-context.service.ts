import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { AuditAction } from "@prisma/tenant-client";
import { AuditContextStore } from "./utils/interfaces";

@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditContextStore>();

  /** Wrap a request handler so services can store audit context within it */
  run<T>(fn: () => T): T {
    return this.storage.run({}, fn);
  }

  /** Call from a service BEFORE the DB mutation — captures the record as it was */
  setOldValue(value: Record<string, any>): void {
    const store = this.storage.getStore();
    if (store) store.oldValue = value;
  }

  /** Override which entity ID gets recorded — use when the logged entity isn't the first route param */
  setEntityId(id: string): void {
    const store = this.storage.getStore();
    if (store) store.entityId = id;
  }

  /** Optionally set a human-readable label (e.g. product name) to show in logs */
  setEntityLabel(label: string): void {
    const store = this.storage.getStore();
    if (store) store.entityLabel = label;
  }

  /** Attach any extra context to the log entry */
  setMetadata(metadata: Record<string, any>): void {
    const store = this.storage.getStore();
    if (store) store.metadata = metadata;
  }

  /**
   * Override the action inferred from the HTTP method — use this on
   * upsert-style routes (always POST) that turn out to have updated an
   * existing row rather than created a new one, so the log records UPDATE
   * with a proper diff instead of a false CREATE with a null oldValue.
   */
  setAction(action: AuditAction): void {
    const store = this.storage.getStore();
    if (store) store.action = action;
  }

  getStore(): AuditContextStore | undefined {
    return this.storage.getStore();
  }
}
