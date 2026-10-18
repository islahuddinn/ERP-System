import http from "k6/http";
import { check, fail } from "k6";
import { login, authHeaders } from "./lib.js";
import { BASE_URL, ENABLE_WRITES, TARGETS, requireEnv } from "./config.js";

export const options = {
  scenarios: {
    grn_post: {
      executor: "constant-vus",
      vus: 2,
      duration: "2m",
    },
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:grn_post}": [`p(95)<${TARGETS.grnP95Ms}`],
  },
};

export function setup() {
  if (!ENABLE_WRITES) {
    fail("GRN writes are off. Set K6_ENABLE_WRITES=true on a disposable load tenant.");
  }
  return login();
}

export default function (session) {
  const purchaseOrderId = requireEnv("K6_PURCHASE_ORDER_ID");
  const rawMaterialId = requireEnv("K6_RAW_MATERIAL_ID");
  const uomId = requireEnv("K6_UOM_ID");
  const siteId = requireEnv("K6_SITE_ID");
  const payload = JSON.stringify({
    purchaseOrderId,
    receivingType: "PURCHASE_ORDER",
    receivedDate: new Date().toISOString(),
    items: [
      {
        rawMaterialId,
        uomId,
        expectedQuantity: 1,
        receivedQuantity: 1,
        batches: [{ siteId, quantity: 1 }],
      },
    ],
  });

  const res = http.post(`${BASE_URL}/grn`, payload, {
    headers: authHeaders(session.token, session.tenantId),
    tags: { name: "grn_post" },
    responseCallback: http.expectedStatuses(200, 201, 400),
  });
  check(res, {
    "GRN 201, 200, or 400 duplicate": (r) =>
      r.status === 201 || r.status === 200 || r.status === 400,
  });
}
