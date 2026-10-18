export const BASE_URL = (__ENV.K6_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");
export const TENANT_ID = __ENV.K6_TENANT_ID || "3991";
export const TENANT_B_ID = __ENV.K6_TENANT_B_ID || "";
export const ENABLE_WRITES = __ENV.K6_ENABLE_WRITES === "true";

export const TARGETS = {
  loginP95Ms: 300,
  stockP95Ms: 400,
  posP95Ms: 800,
  grnP95Ms: 1500,
  errorRate: 0.001,
};

export function requireEnv(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`${name} is required. See load/k6/README.md`);
  }
  return value;
}
