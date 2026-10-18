import { login, getPermissions } from "./lib.js";
import { TARGETS } from "./config.js";

export const options = {
  scenarios: {
    login_permissions: {
      executor: "constant-arrival-rate",
      rate: 50,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 20,
      maxVUs: 80,
    },
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:login}": [`p(95)<${TARGETS.loginP95Ms}`],
    "http_req_duration{name:me_permissions}": [`p(95)<${TARGETS.loginP95Ms}`],
  },
};

export default function () {
  const session = login();
  getPermissions(session.token, session.tenantId);
}
