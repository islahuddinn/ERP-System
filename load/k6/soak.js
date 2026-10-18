import http from "k6/http";
import { check } from "k6";
import { login, getPermissions, getStockBalances, authHeaders } from "./lib.js";
import { BASE_URL, ENABLE_WRITES, TARGETS, TENANT_B_ID } from "./config.js";

const writeScenarios = ENABLE_WRITES
  ? {
      pos_checkout: {
        executor: "constant-vus",
        exec: "posCheckout",
        vus: 10,
        duration: "30m",
      },
    }
  : {};

const writeThresholds = ENABLE_WRITES
  ? { "http_req_duration{name:pos_checkout}": [`p(95)<${TARGETS.posP95Ms}`] }
  : {};

export const options = {
  scenarios: {
    login_permissions: {
      executor: "constant-arrival-rate",
      exec: "loginAndPermissions",
      rate: 20,
      timeUnit: "1s",
      duration: "30m",
      preAllocatedVUs: 15,
      maxVUs: 60,
    },
    stock_read: {
      executor: "constant-arrival-rate",
      exec: "stockRead",
      rate: 20,
      timeUnit: "1s",
      duration: "30m",
      preAllocatedVUs: 10,
      maxVUs: 40,
    },
    tenant_switch: {
      executor: "constant-arrival-rate",
      exec: "tenantSwitch",
      rate: 5,
      timeUnit: "1s",
      duration: "30m",
      preAllocatedVUs: 5,
      maxVUs: 15,
    },
    ...writeScenarios,
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:login}": [`p(95)<${TARGETS.loginP95Ms}`],
    "http_req_duration{name:me_permissions}": [`p(95)<${TARGETS.loginP95Ms}`],
    "http_req_duration{name:stock_balances}": [`p(95)<${TARGETS.stockP95Ms}`],
    "http_req_duration{name:tenant_switch}": [`p(95)<${TARGETS.loginP95Ms}`],
    ...writeThresholds,
  },
};

export function setup() {
  return login();
}

export function loginAndPermissions() {
  const session = login();
  getPermissions(session.token, session.tenantId);
}

export function stockRead(session) {
  getStockBalances(session.token, session.tenantId);
}

export function tenantSwitch(session) {
  const spoofedTenant = TENANT_B_ID || "00000000-0000-0000-0000-000000000000";
  const res = http.get(`${BASE_URL}/users/me/permissions`, {
    headers: authHeaders(session.token, spoofedTenant),
    tags: { name: "tenant_switch" },
  });
  check(res, { "JWT tenant wins over X-Tenant-Id": (r) => r.status === 200 });
}

export function posCheckout(session) {
  const warehouseId = __ENV.K6_WAREHOUSE_ID;
  const productId = __ENV.K6_PRODUCT_ID;
  if (!warehouseId || !productId) return;

  const res = http.post(
    `${BASE_URL}/pos/sales`,
    JSON.stringify({
      warehouseId,
      taxRate: 0,
      items: [
        {
          itemType: "PRODUCT",
          productId,
          itemName: "k6 POS soak item",
          quantity: 1,
          unitPrice: 1,
        },
      ],
      payments: [{ paymentMethod: "CASH", amount: 1 }],
    }),
    {
      headers: authHeaders(session.token, session.tenantId),
      tags: { name: "pos_checkout" },
    },
  );
  check(res, { "POS checkout accepted": (r) => r.status === 201 || r.status === 200 });
}
