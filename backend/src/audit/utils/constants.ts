export const DEFAULT_SENSITIVE_FIELDS: readonly string[] = [
  'password',
  'passwordHash',
  'hashedPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'privateKey',
  'pin',
  'otp',
  'cvv',
  'cardNumber',
];

import { AuditAction } from "@prisma/tenant-client";

export const AUDIT_HTTP_METHOD_ACTION_MAP: Record<string, AuditAction> = {
  POST: AuditAction.CREATE,
  PUT: AuditAction.UPDATE,
  PATCH: AuditAction.UPDATE,
  DELETE: AuditAction.DELETE,
};

export const AUDIT_LOG_DEFAULT_LIMIT = 50;
export const AUDIT_LOG_MAX_LIMIT = 500;
