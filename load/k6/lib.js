import http from "k6/http";
import { check, fail } from "k6";
import { BASE_URL, TENANT_ID, requireEnv } from "./config.js";

export function login(overrides = {}) {
  const tenantId = overrides.tenantId || TENANT_ID;
  const payload = JSON.stringify({
    email: overrides.email || requireEnv("K6_EMAIL"),
    password: overrides.password || requireEnv("K6_PASSWORD"),
    tenantId,
  });

  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: {
      "Content-Type": "application/json",
      "X-Tenant-Id": tenantId,
    },
    tags: { name: "login" },
  });

  const ok = check(res, { "login 200": (r) => r.status === 200 });
  if (!ok) {
    fail(`login failed: ${res.status} ${res.body}`);
  }

  const token = res.json("data.access_token");
  if (!token) {
    fail(`login response missing access_token: ${res.body}`);
  }

  return { token, tenantId };
}

export function authHeaders(token, tenantId = TENANT_ID) {
  return {
    Authorization: `Bearer ${token}`,
    "X-Tenant-Id": tenantId,
    "Content-Type": "application/json",
  };
}

export function getPermissions(token, tenantId = TENANT_ID) {
  const res = http.get(`${BASE_URL}/users/me/permissions`, {
    headers: authHeaders(token, tenantId),
    tags: { name: "me_permissions" },
  });
  check(res, { "permissions 200": (r) => r.status === 200 });
  return res;
}

export function getStockBalances(token, tenantId = TENANT_ID) {
  const res = http.get(`${BASE_URL}/warehouses/stock/balances?page=1&limit=20`, {
    headers: authHeaders(token, tenantId),
    tags: { name: "stock_balances" },
  });
  check(res, { "stock 200": (r) => r.status === 200 });
  return res;
}
