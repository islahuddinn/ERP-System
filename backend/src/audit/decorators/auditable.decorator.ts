import { SetMetadata } from "@nestjs/common";
import { AuditableOptions } from "../utils/interfaces";

export const AUDITABLE_KEY = "auditable";

/**
 * Mark a controller method for automatic audit logging.
 *
 * The AuditInterceptor picks this up and writes an AuditLog entry after
 * the handler responds successfully. Action is inferred from the HTTP method
 * unless overridden via options.action.
 *
 * @example
 * @Auditable({ module: AuditModule.PRODUCTS })
 * @Patch(':productId')
 * update(...) {}
 */
export const Auditable = (options: AuditableOptions) => SetMetadata(AUDITABLE_KEY, options);
