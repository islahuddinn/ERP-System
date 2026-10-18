import { pickTenantIdentifier } from "./pick-tenant-identifier";

describe("pickTenantIdentifier", () => {
  it("uses the JWT tenant when a Bearer token is present, even if the header names another tenant", () => {
    const result = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-a",
      headerTenantId: "tenant-b",
    });

    expect(result).toEqual({ tenantId: "tenant-a", ignoredMismatchedHeader: true });
  });

  it("does not let tenant B read tenant A by swapping X-Tenant-Id on a signed-in session", () => {
    const asTenantA = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-a",
      headerTenantId: "tenant-b",
    });
    const asTenantB = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-b",
      headerTenantId: "tenant-a",
    });

    expect(asTenantA.tenantId).toBe("tenant-a");
    expect(asTenantB.tenantId).toBe("tenant-b");
    expect(asTenantA.tenantId).not.toBe(asTenantB.tenantId);
  });

  it("falls back to the header when there is no Bearer token", () => {
    const result = pickTenantIdentifier({
      hasBearer: false,
      jwtTenantId: null,
      headerTenantId: "tenant-b",
    });

    expect(result).toEqual({ tenantId: "tenant-b", ignoredMismatchedHeader: false });
  });
});
