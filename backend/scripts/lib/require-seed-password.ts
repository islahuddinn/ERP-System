import { existsSync, readFileSync } from "fs";
import path from "path";

/**
 * Seed / bootstrap scripts must never ship a hardcoded admin password.
 * Set SEED_ADMIN_PASSWORD in backend/.env (local demo only).
 */
function loadBackendEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../../.env"),
  ];

  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    const content = readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (key && process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
    return;
  }
}

export function requireSeedPassword(envKey = "SEED_ADMIN_PASSWORD"): string {
  loadBackendEnv();
  const password = process.env[envKey]?.trim();

  if (!password || password.length < 8) {
    throw new Error(
      `${envKey} must be set to a password of at least 8 characters. Put it in backend/.env — do not hardcode it in scripts.`,
    );
  }

  return password;
}
