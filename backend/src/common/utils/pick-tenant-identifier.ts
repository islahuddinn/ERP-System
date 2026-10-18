/**
 * Choose which tenant identifier wins for a request.
 *
 * When a Bearer token carries a tenantId, that value is the source of truth.
 * A mismatched X-Tenant-Id header is ignored so tenant A cannot read tenant B
 * by swapping the header on a stolen or reused session.
 */
export function pickTenantIdentifier(input: {
  hasBearer: boolean;
  jwtTenantId: string | null;
  headerTenantId: string | null;
}): { tenantId: string | null; ignoredMismatchedHeader: boolean } {
  const { hasBearer, jwtTenantId, headerTenantId } = input;

  if (hasBearer && jwtTenantId) {
    return {
      tenantId: jwtTenantId,
      ignoredMismatchedHeader: Boolean(headerTenantId && headerTenantId !== jwtTenantId),
    };
  }

  if (headerTenantId) {
    return { tenantId: headerTenantId, ignoredMismatchedHeader: false };
  }

  if (jwtTenantId) {
    return { tenantId: jwtTenantId, ignoredMismatchedHeader: false };
  }

  return { tenantId: null, ignoredMismatchedHeader: false };
}
