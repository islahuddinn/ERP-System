import { pickTenantIdentifier } from "../common/utils/pick-tenant-identifier";

describe("golden rule: tenant A never reads tenant B", () => {
  it("JWT tenant wins over a mismatched X-Tenant-Id on a signed-in request", () => {
    const stolenSessionAgainstOtherTenant = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-a",
      headerTenantId: "tenant-b",
    });

    expect(stolenSessionAgainstOtherTenant.tenantId).toBe("tenant-a");
    expect(stolenSessionAgainstOtherTenant.ignoredMismatchedHeader).toBe(true);
  });

  it("two signed-in tenants never resolve to each other's id", () => {
    const a = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-a",
      headerTenantId: "tenant-b",
    });
    const b = pickTenantIdentifier({
      hasBearer: true,
      jwtTenantId: "tenant-b",
      headerTenantId: "tenant-a",
    });

    expect(a.tenantId).not.toBe(b.tenantId);
  });
});
