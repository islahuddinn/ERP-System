import * as fs from "fs";
import * as path from "path";
import { PERMISSIONS } from "../users/permissions/permission.definitions";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [full];
  });
}

describe("golden rule: permissions are defined before use", () => {
  it("every @RequirePermission string exists in PERMISSIONS", () => {
    const srcRoot = path.join(process.cwd(), "src");
    const files = walk(srcRoot).filter((file) => file.endsWith(".controller.ts"));
    const defined = new Set(Object.keys(PERMISSIONS));
    const missing: string[] = [];

    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      const callPattern = /@RequirePermission\(([^)]*)\)/g;
      let match: RegExpExecArray | null;
      while ((match = callPattern.exec(source))) {
        const names = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
        for (const name of names) {
          if (!defined.has(name)) {
            missing.push(`${path.relative(srcRoot, file)}: ${name}`);
          }
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
