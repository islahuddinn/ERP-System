import { BadRequestException, NotFoundException } from "@nestjs/common";
import { TenantStatus } from "@prisma/master-client";
import { TenantLifecycleService } from "./tenant-lifecycle.service";

describe("TenantLifecycleService", () => {
  const findFirst = jest.fn();
  let service: TenantLifecycleService;

  beforeEach(() => {
    findFirst.mockReset();
    service = new TenantLifecycleService({ tenant: { findFirst } } as any);
  });

  it("caches master tenant lookups by id and short id within the TTL", async () => {
    findFirst.mockResolvedValue({
      id: "uuid-1",
      shortTenantId: "3991",
      schemaName: "tenant_3991",
      status: TenantStatus.ACTIVE,
    });

    const first = await service.getActiveOrThrow("3991");
    const second = await service.getActiveOrThrow("uuid-1");

    expect(first.schemaName).toBe("tenant_3991");
    expect(second.id).toBe("uuid-1");
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it("rejects inactive tenants", async () => {
    findFirst.mockResolvedValue({
      id: "uuid-1",
      shortTenantId: "3991",
      schemaName: "tenant_3991",
      status: TenantStatus.SUSPENDED,
    });

    await expect(service.getActiveOrThrow("3991")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws when the tenant is missing", async () => {
    findFirst.mockResolvedValue(null);

    await expect(service.getActiveOrThrow("missing")).rejects.toBeInstanceOf(NotFoundException);
  });
});
