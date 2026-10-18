#!/usr/bin/env node
/**
 * Seed dummy data so every chart on the main dashboard has realistic figures to
 * render LOCALLY. Covers the sources behind each dashboard card:
 *
 *   - suppliers + supplier_transactions  → "Top Suppliers by Spend" column chart
 *   - purchase_orders                    → "Purchase Orders" status donut + segments bubble
 *   - boms                               → "Bills of Material" status donut
 *   - production_orders                  → "Production Orders" donut + completion gauge + bubble
 *   - grn + grn_items                    → "Goods Receipts" donut + acceptance gauge
 *   - customers                          → "Top Customers by Balance" bar + active gauge + bubble
 *
 * LOCAL ONLY. It refuses to run against anything that is not localhost.
 * Idempotent per domain: every row it creates carries the marker below in a text
 * column, and each domain checks for that marker before inserting — so re-running
 * (or running after a partial run) only fills in what is missing.
 *
 * Usage (from backend/), pointed at the tenant DB the local app actually serves:
 *   DATABASE_URL="postgresql://postgres:<pw>@localhost:5434/inventory_8549" \
 *     node scripts/seed-dashboard-dummy.js
 *
 * DATABASE_URL is read from the environment, falling back to backend/.env.
 */

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const SEED_MARKER = 'DASH-DUMMY-SEED'

// Descending spend so the supplier column chart shows a clean staircase.
const DUMMY_SUPPLIERS = [
  { name: 'Global Steel Traders', spend: 1_250_000 },
  { name: 'Apex Packaging Co', spend: 940_000 },
  { name: 'Nile Chemicals Ltd', spend: 720_000 },
  { name: 'Orion Electricals', spend: 560_000 },
  { name: 'Sunrise Textiles', spend: 410_000 },
  { name: 'Delta Logistics', spend: 260_000 },
]

// Purchase orders spread across every status, with a couple part-paid so the
// payables figure is non-trivial. total is the order value; paid drives payment.
const DUMMY_PURCHASE_ORDERS = [
  { status: 'DRAFT', total: 120_000, paid: 0, paymentStatus: 'PENDING' },
  { status: 'DRAFT', total: 85_000, paid: 0, paymentStatus: 'PENDING' },
  { status: 'CONFIRMED', total: 240_000, paid: 0, paymentStatus: 'PENDING' },
  { status: 'CONFIRMED', total: 175_000, paid: 60_000, paymentStatus: 'PARTIAL' },
  { status: 'CONFIRMED', total: 96_000, paid: 0, paymentStatus: 'PENDING' },
  { status: 'PARTIAL', total: 310_000, paid: 150_000, paymentStatus: 'PARTIAL' },
  { status: 'PARTIAL', total: 128_000, paid: 64_000, paymentStatus: 'PARTIAL' },
  { status: 'RECEIVED', total: 420_000, paid: 420_000, paymentStatus: 'PAID' },
  { status: 'RECEIVED', total: 265_000, paid: 265_000, paymentStatus: 'PAID' },
  { status: 'RECEIVED', total: 198_000, paid: 198_000, paymentStatus: 'PAID' },
  { status: 'RECEIVED', total: 142_000, paid: 100_000, paymentStatus: 'PARTIAL' },
  { status: 'CANCELLED', total: 74_000, paid: 0, paymentStatus: 'CANCELLED' },
]

const DUMMY_BOM_STATUSES = ['DRAFT', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']

// Production orders across statuses. Completed ones carry a total cost — the
// dashboard only sums cost for COMPLETED, and the bubble/gauge read those too.
const DUMMY_PRODUCTION_ORDERS = [
  { status: 'DRAFT', planned: 100, totalCost: 0 },
  { status: 'DRAFT', planned: 60, totalCost: 0 },
  { status: 'IN_PROGRESS', planned: 200, totalCost: 0 },
  { status: 'IN_PROGRESS', planned: 150, totalCost: 0 },
  { status: 'IN_PROGRESS', planned: 90, totalCost: 0 },
  { status: 'COMPLETED', planned: 250, totalCost: 320_000 },
  { status: 'COMPLETED', planned: 180, totalCost: 228_000 },
  { status: 'COMPLETED', planned: 120, totalCost: 154_000 },
  { status: 'COMPLETED', planned: 300, totalCost: 396_000 },
  { status: 'CANCELLED', planned: 80, totalCost: 0 },
]

// GRNs across statuses; each carries one item with a received/rejected split so
// the acceptance-rate gauge lands around the low-90s rather than a flat 100%.
const DUMMY_GRNS = [
  { status: 'PENDING', received: 0, rejected: 0 },
  { status: 'PENDING', received: 0, rejected: 0 },
  { status: 'INSPECTING', received: 480, rejected: 20 },
  { status: 'INSPECTING', received: 620, rejected: 40 },
  { status: 'APPROVED', received: 900, rejected: 30 },
  { status: 'APPROVED', received: 750, rejected: 15 },
  { status: 'REJECTED', received: 0, rejected: 120 },
  { status: 'COMPLETED', received: 1100, rejected: 25 },
  { status: 'COMPLETED', received: 840, rejected: 10 },
  { status: 'COMPLETED', received: 560, rejected: 5 },
]

// Descending balances for the customer ranking; a couple inactive for the gauge.
const DUMMY_CUSTOMERS = [
  { name: 'Meridian Retail Group', balance: 85_000, isActive: true },
  { name: 'Coastline Wholesale', balance: 62_000, isActive: true },
  { name: 'Summit Distributors', balance: 48_000, isActive: true },
  { name: 'Harbor Trading Co', balance: 31_000, isActive: true },
  { name: 'Cedar Lane Markets', balance: 19_000, isActive: false },
  { name: 'Brightway Stores', balance: 8_000, isActive: false },
]

// ─────────────────────────────── Environment guard ───────────────────────────────

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL

  const envPath = path.resolve(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return null

  const line = fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .find((row) => row.trim().startsWith('DATABASE_URL='))
  if (!line) return null

  return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
}

function assertLocalDatabase(databaseUrl) {
  const host = new URL(databaseUrl).hostname
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) {
    throw new Error(
      `Refusing to seed: DATABASE_URL host "${host}" is not local. This script is local-only.`,
    )
  }
}

// ─────────────────────────────────── Helpers ───────────────────────────────────

async function markerExists(client, table, column) {
  const result = await client.query(
    `SELECT 1 FROM public.${table} WHERE ${column} = $1 LIMIT 1`,
    [SEED_MARKER],
  )
  return result.rowCount > 0
}

async function firstId(client, table) {
  const result = await client.query(`SELECT id FROM public.${table} LIMIT 1`)
  return result.rowCount > 0 ? result.rows[0].id : null
}

// ─────────────────────────────────── Suppliers ───────────────────────────────────

async function insertSupplierWithSpend(client, supplier) {
  const supplierResult = await client.query(
    `INSERT INTO public.suppliers (id, name, email, phone, notes, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, true, now(), now())
     RETURNING id`,
    [
      supplier.name,
      `${supplier.name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`,
      '+1-555-0100',
      SEED_MARKER,
    ],
  )
  const supplierId = supplierResult.rows[0].id

  const firstDebit = Math.round(supplier.spend * 0.6)
  const secondDebit = supplier.spend - firstDebit

  await client.query(
    `INSERT INTO public.supplier_transactions
       (id, supplier_id, date, type, reference, description, debit, credit, created_at, updated_at)
     VALUES
       (gen_random_uuid(), $1, now() - interval '30 days', 'PURCHASE', $2, $3, $4, 0, now(), now()),
       (gen_random_uuid(), $1, now() - interval '7 days',  'PURCHASE', $2, $5, $6, 0, now(), now())`,
    [
      supplierId,
      SEED_MARKER,
      `Purchase invoice for ${supplier.name}`,
      firstDebit,
      `Purchase invoice for ${supplier.name}`,
      secondDebit,
    ],
  )
}

async function seedSuppliers(client) {
  if (await markerExists(client, 'supplier_transactions', 'reference')) {
    console.log('  suppliers: already present, skipping')
    return
  }
  for (const supplier of DUMMY_SUPPLIERS) {
    await insertSupplierWithSpend(client, supplier)
  }
  console.log(`  suppliers: seeded ${DUMMY_SUPPLIERS.length} with purchase transactions`)
}

// ──────────────────────────────── Purchase orders ────────────────────────────────

async function seedPurchaseOrders(client) {
  if (await markerExists(client, 'purchase_orders', 'remarks')) {
    console.log('  purchase orders: already present, skipping')
    return
  }
  let index = 0
  for (const order of DUMMY_PURCHASE_ORDERS) {
    index += 1
    const orderNumber = `PO-DUMMY-${String(index).padStart(4, '0')}`
    await client.query(
      `INSERT INTO public.purchase_orders
         (id, order_number, status, sub_total, shipping_cost, total_amount, amount_paid,
          payment_status, remarks, created_by_id, order_date, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, 0, $3, $4, $5, $6, $6, now() - interval '20 days', now(), now())`,
      [orderNumber, order.status, order.total, order.paid, order.paymentStatus, SEED_MARKER],
    )
  }
  console.log(`  purchase orders: seeded ${DUMMY_PURCHASE_ORDERS.length} across all statuses`)
}

// ──────────────────────────────────── BOMs ────────────────────────────────────

async function seedBoms(client, productId) {
  if (await markerExists(client, 'boms', 'description')) {
    console.log('  boms: already present, skipping')
    return []
  }
  if (!productId) {
    console.log('  boms: no product to attach to, skipping')
    return []
  }
  const bomIds = []
  let index = 0
  for (const status of DUMMY_BOM_STATUSES) {
    index += 1
    const bomNumber = `BOM-DUMMY-${String(index).padStart(4, '0')}`
    const result = await client.query(
      `INSERT INTO public.boms
         (id, bom_number, product_id, name, description, status, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, now(), now())
       RETURNING id`,
      [bomNumber, productId, `Dummy Recipe ${index}`, SEED_MARKER, status],
    )
    bomIds.push(result.rows[0].id)
  }
  console.log(`  boms: seeded ${DUMMY_BOM_STATUSES.length} across all statuses`)
  return bomIds
}

// ─────────────────────────────── Production orders ───────────────────────────────

async function existingBomId(client) {
  const result = await client.query('SELECT id FROM public.boms LIMIT 1')
  return result.rowCount > 0 ? result.rows[0].id : null
}

async function seedProductionOrders(client, productId, bomId) {
  if (await markerExists(client, 'production_orders', 'notes')) {
    console.log('  production orders: already present, skipping')
    return
  }
  if (!productId || !bomId) {
    console.log('  production orders: need a product and a BOM, skipping')
    return
  }
  let index = 0
  for (const order of DUMMY_PRODUCTION_ORDERS) {
    index += 1
    const orderNumber = `PRO-DUMMY-${String(index).padStart(4, '0')}`
    const produced = order.status === 'COMPLETED' ? order.planned : 0
    await client.query(
      `INSERT INTO public.production_orders
         (id, order_number, product_id, bom_id, planned_quantity, produced_quantity, status,
          raw_material_cost, additional_cost, waste_input_cost, total_cost, notes,
          created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, $6, 0, 0, 0, $7, $8, now(), now())`,
      [
        orderNumber,
        productId,
        bomId,
        order.planned,
        produced,
        order.status,
        order.totalCost,
        SEED_MARKER,
      ],
    )
  }
  console.log(`  production orders: seeded ${DUMMY_PRODUCTION_ORDERS.length} across all statuses`)
}

// ──────────────────────────────── GRNs + items ────────────────────────────────

async function seedGrns(client, rawMaterialId, uomId) {
  if (await markerExists(client, 'grn', 'notes')) {
    console.log('  goods receipts: already present, skipping')
    return
  }
  if (!rawMaterialId || !uomId) {
    console.log('  goods receipts: need a raw material and a UOM, skipping')
    return
  }
  let index = 0
  for (const grn of DUMMY_GRNS) {
    index += 1
    const receivingNumber = `GRN-DUMMY-${String(index).padStart(4, '0')}`
    const grnResult = await client.query(
      `INSERT INTO public.grn
         (id, receiving_number, status, "receivingType", received_date, notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'PURCHASE_ORDER', now() - interval '10 days', $3, now(), now())
       RETURNING id`,
      [receivingNumber, grn.status, SEED_MARKER],
    )
    const grnId = grnResult.rows[0].id
    const expected = grn.received + grn.rejected

    await client.query(
      `INSERT INTO public.grn_items
         (id, grn_id, raw_material_id, uom_id, expected_quantity, received_quantity,
          rejected_quantity, receiving_notes, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [grnId, rawMaterialId, uomId, expected, grn.received, grn.rejected, SEED_MARKER],
    )
  }
  console.log(`  goods receipts: seeded ${DUMMY_GRNS.length} with received/rejected items`)
}

// ─────────────────────────────────── Customers ───────────────────────────────────

async function seedCustomers(client) {
  // Customer schema requires territory + category FKs — seeded via seed-module-test-data.ts.
  const result = await client.query(
    `SELECT 1 FROM public.customers WHERE remarks = $1 LIMIT 1`,
    [SEED_MARKER],
  )
  if (result.rowCount > 0) {
    console.log('  customers: already present, skipping')
    return
  }
  console.log('  customers: skipped (run scripts/seed-module-test-data.ts for customer master data)')
}

// ──────────────────────────────────── Runner ────────────────────────────────────

async function main() {
  const databaseUrl = resolveDatabaseUrl()
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set and backend/.env has no DATABASE_URL. Aborting.')
    process.exit(1)
  }

  assertLocalDatabase(databaseUrl)

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()
  console.log(`Seeding dashboard dummy data into ${new URL(databaseUrl).pathname.slice(1)} ...`)

  try {
    // FK-constrained rows reuse whatever master data already exists locally.
    const [productId, rawMaterialId, uomId] = await Promise.all([
      firstId(client, 'products'),
      firstId(client, 'raw_materials'),
      firstId(client, 'uoms'),
    ])

    await client.query('BEGIN')

    await seedSuppliers(client)
    await seedPurchaseOrders(client)
    const seededBomIds = await seedBoms(client, productId)
    const bomId = seededBomIds[0] ?? (await existingBomId(client))
    await seedProductionOrders(client, productId, bomId)
    await seedGrns(client, rawMaterialId, uomId)
    await seedCustomers(client)

    await client.query('COMMIT')
    console.log('Done.')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Seed failed:', error.message)
  process.exit(1)
})
