import { login, getStockBalances } from "./lib.js";
import { TARGETS } from "./config.js";

export const options = {
  scenarios: {
    stock_read: {
      executor: "constant-arrival-rate",
      rate: 30,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 15,
      maxVUs: 50,
    },
  },
  thresholds: {
    http_req_failed: [`rate<${TARGETS.errorRate}`],
    "http_req_duration{name:stock_balances}": [`p(95)<${TARGETS.stockP95Ms}`],
  },
};

export function setup() {
  return login();
}

export default function (session) {
  getStockBalances(session.token, session.tenantId);
}
