/**
 * Sync a tenant database schema to match prisma/tenant/schema.prisma.
 * Use when migrate deploy fails (e.g. legacy DB without _prisma_migrations).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/ensure-tenant-schema-sync.ts
 *   TENANT_SHORT_ID=3991 npx ts-node scripts/ensure-tenant-schema-sync.ts
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { URL } from "url";

function loadEnvFile(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!key) continue;
    const value = rest.join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
    env[key] = value;
  }
  return env;
}

function buildTenantDatabaseUrl(baseUrl: string, tenantShortId: string): string {
  const url = new URL(baseUrl);
  url.search = "";
  url.pathname = `/${tenantShortId}`;
  url.searchParams.set("schema", "public");
  return url.toString();
}

function resolveTenantDatabaseUrl(): string {
  const envPath = path.resolve(__dirname, "../.env");
  if (!process.env.DATABASE_URL) {
    const env = loadEnvFile(envPath);
    for (const [key, value] of Object.entries(env)) {
      if (!process.env[key]) process.env[key] = value;
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — add it to backend/.env");
  }

  const tenantShortId = process.env.TENANT_SHORT_ID ?? "3991";
  return buildTenantDatabaseUrl(process.env.DATABASE_URL, tenantShortId);
}

async function main() {
  const tenantShortId = process.env.TENANT_SHORT_ID ?? "3991";
  const databaseUrl = resolveTenantDatabaseUrl();

  console.log(`🔄 Syncing tenant ${tenantShortId} schema (db push)...`);
  console.log(`   Database: ${databaseUrl.split("@")[1]?.split("?")[0] ?? "tenant DB"}\n`);

  execSync("npx prisma db push --schema=prisma/tenant/schema.prisma --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: databaseUrl },
    cwd: path.resolve(__dirname, ".."),
  });

  console.log("\n✅ Tenant schema sync complete.");
}

main().catch((error) => {
  console.error("❌ Schema sync failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
