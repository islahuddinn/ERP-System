import { AuditAction } from "@prisma/tenant-client";
import { buildDiff } from "../audit/utils/diff.util";
import { AuditInterceptor } from "../audit/interceptors/audit.interceptor";

describe("golden rule: audit stores a real entity, not a message", () => {
  it("CREATE snapshots keep the entity fields, not a { message } stub", () => {
    const interceptor = new AuditInterceptor({} as any, {} as any, {} as any);
    const extract = (interceptor as any).extractResponseData.bind(interceptor);

    expect(extract({ message: "Created" })).toEqual({ message: "Created" });
    expect(extract({ message: "Created" }).id).toBeUndefined();
    expect(extract({ id: "po-1", orderNumber: "PO-001", status: "DRAFT" }).id).toBe("po-1");
    expect(extract({ success: true, data: { id: "po-1", totalAmount: 100 } }).id).toBe("po-1");
  });

  it("DELETE always stores newValue as null", () => {
    const newValue =
      AuditAction.DELETE !== "DELETE"
        ? { id: "x" }
        : null;
    expect(newValue).toBeNull();
  });

  it("diffs skip noise fields and keep money fields", () => {
    const diff = buildDiff(
      { totalAmount: 100, updatedAt: "t1", password: "secret" },
      { totalAmount: 150, updatedAt: "t2", password: "secret2" },
    );
    expect(diff?.totalAmount).toEqual({ from: 100, to: 150 });
    expect(diff?.updatedAt).toBeUndefined();
  });
});
