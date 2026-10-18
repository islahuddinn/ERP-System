# k6 load and soak (Phase 4)

Scripts live next to this file. They fail the run if p95 or error-rate thresholds miss the roadmap targets.

| Script | What it hits | Target |
|---|---|---|
| `login.js` | `POST /auth/login` + `GET /users/me/permissions` | p95 < 300 ms at 50 RPS |
| `stock.js` | `GET /warehouses/stock/balances` | p95 < 400 ms at 30 RPS |
| `tenant-switch.js` | JWT A + spoofed `X-Tenant-Id` | p95 < 300 ms; still 200 for tenant A |
| `pos.js` | `POST /pos/sales` | p95 < 800 ms at 10 VUs (writes) |
| `grn.js` | `POST /grn` | p95 < 1.5 s (writes) |
| `gate.js` | mixed ~2 min (nightly CI) | error rate < 0.1% |
| `soak.js` | mixed 30 min | error rate < 0.1% |

## Required env

Never put passwords in the scripts.

```bash
export K6_BASE_URL=http://localhost:5000/api
export K6_EMAIL=you@example.com
export K6_PASSWORD='from SEED_ADMIN_PASSWORD / your vault'
export K6_TENANT_ID=3991
```

On the **API process** used for load (not production):

```bash
export LOAD_TEST_BYPASS_THROTTLE=true   # login is 5/min otherwise
export TENANT_PRISMA_CONNECTION_LIMIT=5 # default; raise only if Postgres max_connections allows it
```

Apply tenant migration `20260908210000_hot_path_indexes` before measuring.

## Run

```bash
k6 run load/k6/login.js
k6 run load/k6/stock.js
k6 run load/k6/tenant-switch.js
k6 run load/k6/gate.js          # nightly default (reads + login + tenant switch)
K6_ENABLE_WRITES=true k6 run load/k6/soak.js   # 30 min; disposable tenant only
```

Write scenarios (`pos.js`, `grn.js`, `K6_ENABLE_WRITES=true`) need a **resettable** tenant plus:

`K6_WAREHOUSE_ID`, `K6_PRODUCT_ID`, and for GRN `K6_PURCHASE_ORDER_ID`, `K6_RAW_MATERIAL_ID`, `K6_UOM_ID`, `K6_SITE_ID`.

Optional second tenant: `K6_TENANT_B_ID`, `K6_EMAIL_B`, `K6_PASSWORD_B`.

Nightly GitHub Actions runs `gate.js` only when `K6_BASE_URL` is set as a repository secret. It does not run on every PR.
