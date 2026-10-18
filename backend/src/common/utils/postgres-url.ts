import { Client as PgClient } from "pg";

function isLocalPostgresHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "postgres" ||
    hostname === "db"
  );
}

/**
 * Neon (and many hosted Postgres providers) reject non-SSL connections.
 * Node's `pg` driver also ignores `channel_binding=require` (a libpq option
 * Neon copies into URLs), which can cause sslmode to be dropped.
 */
export function normalizePostgresConnectionString(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete("channel_binding");
  if (!isLocalPostgresHost(url.hostname)) {
    const sslmode = url.searchParams.get("sslmode");
    if (!sslmode || sslmode === "disable" || sslmode === "allow" || sslmode === "prefer") {
      url.searchParams.set("sslmode", "require");
    }
  }
  return url.toString();
}

export function withPostgresDatabaseName(
  connectionString: string,
  databaseName: string,
  extraParams?: Record<string, string>,
): string {
  const url = new URL(normalizePostgresConnectionString(connectionString));
  const name = databaseName.replace(/^\//, "").split("?")[0];
  url.pathname = `/${name}`;
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/** Neon pooler (PgBouncer) cannot run CREATE/DROP DATABASE. Strip `-pooler` from the host. */
export function toDirectPostgresConnectionString(connectionString: string): string {
  const url = new URL(normalizePostgresConnectionString(connectionString));
  url.hostname = url.hostname.replace(/-pooler(?=\.|$)/i, "");
  return url.toString();
}

export function postgresDatabaseName(connectionString: string): string {
  const url = new URL(connectionString);
  const path = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;
  return path.split("?")[0];
}

export function createSecurePgClient(connectionString: string): PgClient {
  const normalized = normalizePostgresConnectionString(connectionString);
  const hostname = new URL(normalized).hostname;
  return new PgClient({
    connectionString: normalized,
    ssl: isLocalPostgresHost(hostname) ? undefined : { rejectUnauthorized: false },
  });
}
