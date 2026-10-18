import { check } from "k6";
import http from "k6/http";
import { login, authHeaders, getPermissions } from "./lib.js";
import { BASE_URL, TENANT_B_ID, TARGETS } from "./config.js";

export const options = {
  scenarios: {
    tenant_switch: {
      executor: "constant-arrival-rate",
      rate: 10,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:tenant_switch}": [`p(95)<${TARGETS.loginP95Ms}`],
  },
};

export default function () {
  const sessionA = login();
  const spoofedTenant = TENANT_B_ID || "00000000-0000-0000-0000-000000000000";
  const res = http.get(`${BASE_URL}/users/me/permissions`, {
    headers: authHeaders(sessionA.token, spoofedTenant),
    tags: { name: "tenant_switch" },
  });

  check(res, {
    "JWT tenant wins over X-Tenant-Id": (r) => r.status === 200,
  });

  if (TENANT_B_ID && __ENV.K6_EMAIL_B && __ENV.K6_PASSWORD_B) {
    const sessionB = login({
      tenantId: TENANT_B_ID,
      email: __ENV.K6_EMAIL_B,
      password: __ENV.K6_PASSWORD_B,
    });
    getPermissions(sessionB.token, sessionB.tenantId);
  }
}
