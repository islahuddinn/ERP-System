import http from "k6/http";
import { check, fail } from "k6";
import { login, authHeaders } from "./lib.js";
import { BASE_URL, ENABLE_WRITES, TARGETS, requireEnv } from "./config.js";

export const options = {
  scenarios: {
    pos_checkout: {
      executor: "constant-vus",
      vus: 10,
      duration: "2m",
    },
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:pos_checkout}": [`p(95)<${TARGETS.posP95Ms}`],
  },
};

export function setup() {
  if (!ENABLE_WRITES) {
    fail("POS checkout writes are off. Set K6_ENABLE_WRITES=true on a disposable load tenant.");
  }
  return login();
}

export default function (session) {
  const warehouseId = requireEnv("K6_WAREHOUSE_ID");
  const productId = requireEnv("K6_PRODUCT_ID");
  const payload = JSON.stringify({
    warehouseId,
    taxRate: 0,
    items: [
      {
        itemType: "PRODUCT",
        productId,
        itemName: "k6 POS load item",
        quantity: 1,
        unitPrice: 1,
      },
    ],
    payments: [{ paymentMethod: "CASH", amount: 1 }],
  });

  const res = http.post(`${BASE_URL}/pos/sales`, payload, {
    headers: authHeaders(session.token, session.tenantId),
    tags: { name: "pos_checkout" },
  });
  check(res, { "POS checkout 201 or 200": (r) => r.status === 201 || r.status === 200 });
}
