'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CalendarClock,
  ClipboardList,
  DollarSign,
  Factory,
  Package,
  PackageX,
  Plus,
  ShoppingCart,
  Truck,
  TrendingUp,
  Users,
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { useMoney } from '@/contexts/currency-context'
import { useDashboard, useFactoryDashboard } from '@/hooks/useDashboard'
import {
  useBomStats,
  useCustomerStats,
  useGrnStats,
  useProductStats,
  useProductionOrderStats,
  usePurchaseOrderStats,
  useRawMaterialStats,
  useTopSuppliersBySpend,
} from '@/hooks/useDashboardStats'
import {
  BubbleChart,
  ChartCard,
  ColumnChart,
  DonutChart,
  GaugeChart,
  HealthStat,
  RankedBarChart,
  StatTile,
} from '@/components/dashboard/chart-kit'

export default function DashboardPage() {
  const money = useMoney()

  // Aggregate totals (revenue/profit/stock) plus one call per domain. They are
  // independent, so they load in parallel and each card degrades on its own.
  const { data: dashboardMetrics, isLoading: metricsLoading, error: metricsError } = useDashboard()
  const products = useProductStats()
  const rawMaterials = useRawMaterialStats()
  const purchaseOrders = usePurchaseOrderStats()
  const productionOrders = useProductionOrderStats()
  const bom = useBomStats()
  const grn = useGrnStats()
  const topSuppliers = useTopSuppliersBySpend()
  const customers = useCustomerStats()
  // GET /dashboard/factory — production + quality + waste metrics.
  const factory = useFactoryDashboard()
  const factoryMetrics = factory.data

  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['purchases', 'dashboard', 'recent'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/purchases?page=1&limit=5')
        const responseData = response.data
        if (
          responseData &&
          typeof responseData === 'object' &&
          'data' in responseData &&
          !Array.isArray(responseData.data)
        ) {
          return responseData.data
        }
        return responseData
      } catch (error) {
        console.error('Error fetching purchases:', error)
        return { data: [], meta: { total: 0 } }
      }
    },
    retry: 1,
    staleTime: 60 * 1000,
  })

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-balances', 'dashboard', 'recent'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/stock/balances?page=1&limit=5')
        return response.data
      } catch (error) {
        console.error('Error fetching stock balances:', error)
        return { data: [], meta: { total: 0 } }
      }
    },
    retry: 1,
    staleTime: 60 * 1000,
  })

  // The aggregate endpoint has historically been returned both bare and wrapped.
  const rawMetrics = (dashboardMetrics as any)?.data || dashboardMetrics || {}
  const metrics = {
    totalRevenue: Number(rawMetrics.totalRevenue) || 0,
    netProfit: Number(rawMetrics.netProfit) || 0,
    profitMargin: Number(rawMetrics.profitMargin) || 0,
    totalStockValue: Number(rawMetrics.totalStockValue) || 0,
    totalStockQuantity: Number(rawMetrics.totalStockQuantity) || 0,
  }

  const stockBalances = Array.isArray(stockData?.data)
    ? stockData.data
    : Array.isArray(stockData?.data?.data)
      ? stockData.data.data
      : Array.isArray(stockData)
        ? stockData
        : []

  const purchases = Array.isArray(purchasesData?.data)
    ? purchasesData.data
    : Array.isArray(purchasesData?.data?.data)
      ? purchasesData.data.data
      : Array.isArray(purchasesData)
        ? purchasesData
        : []

  // Bars carry a short label ("245K"); the exact currency amount lives in the tooltip.
  const compactNumber = useMemo(
    () => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }),
    [],
  )
  const formatCompact = (value: number) => compactNumber.format(value || 0)

  const purchaseStats = purchaseOrders.data
  const productionStats = productionOrders.data
  const grnStats = grn.data
  const bomStats = bom.data
  const productStats = products.data
  const rawMaterialStats = rawMaterials.data
  const customerStats = customers.data

  const failedDashboardModules = [
    metricsError ? 'headline totals' : null,
    products.isError ? 'products' : null,
    rawMaterials.isError ? 'raw materials' : null,
    purchaseOrders.isError ? 'purchases' : null,
    productionOrders.isError ? 'production' : null,
    customers.isError ? 'customers' : null,
    factory.error ? 'factory' : null,
  ].filter((label): label is string => Boolean(label))
  const dashboardLoadError = failedDashboardModules.length
    ? getApiErrorMessage(
        metricsError ||
          products.error ||
          rawMaterials.error ||
          purchaseOrders.error ||
          productionOrders.error ||
          customers.error ||
          factory.error,
      )
    : null

  const supplierSpendData = (topSuppliers.data ?? []).map((supplier) => ({
    name: supplier.supplierName,
    value: Number(supplier.totalSpend) || 0,
  }))

  const customerBalanceData = (customerStats?.topCustomersByBalance ?? []).map((customer) => ({
    name: customer.customerName,
    value: Number(customer.balance) || 0,
  }))

  // Operational rates — each a share of a whole, shown on a 0–100% gauge.
  const goodsReceived = grnStats?.totalReceivedQuantity ?? 0
  const goodsRejected = grnStats?.totalRejectedQuantity ?? 0
  const goodsInspected = goodsReceived + goodsRejected
  const goodsAcceptanceRate = goodsInspected > 0 ? (goodsReceived / goodsInspected) * 100 : 0

  const totalProductionCount = productionStats?.totalProductionOrders ?? 0
  const productionCompletionRate =
    totalProductionCount > 0
      ? ((productionStats?.completedProductionOrders ?? 0) / totalProductionCount) * 100
      : 0

  const totalSupplierCount = purchaseStats?.totalSuppliers ?? 0
  const activeSupplierRate =
    totalSupplierCount > 0 ? ((purchaseStats?.activeSuppliers ?? 0) / totalSupplierCount) * 100 : 0

  // Business areas as bubbles: record count (x), value (y), work in flight (size).
  const openPurchaseOrders =
    (purchaseStats?.draftPurchaseOrders ?? 0) +
    (purchaseStats?.confirmedPurchaseOrders ?? 0) +
    (purchaseStats?.partialPurchaseOrders ?? 0)

  const outstandingReceivable = (customerStats?.topCustomersByBalance ?? []).reduce(
    (sum, customer) => sum + (Number(customer.balance) || 0),
    0,
  )

  const businessSegmentData = [
    {
      name: 'Procurement',
      x: purchaseStats?.totalPurchaseOrders ?? 0,
      y: purchaseStats?.totalPurchaseValue ?? 0,
      z: openPurchaseOrders,
    },
    {
      name: 'Production',
      x: productionStats?.totalProductionOrders ?? 0,
      y: productionStats?.totalProductionCost ?? 0,
      z: productionStats?.inProgressProductionOrders ?? 0,
    },
    {
      name: 'Receivables',
      x: customerStats?.totalCustomers ?? 0,
      y: outstandingReceivable,
      z: customerStats?.activeCustomers ?? 0,
    },
  ].filter((point) => point.x > 0 || point.y > 0)

  const segmentsLoading =
    purchaseOrders.isLoading || productionOrders.isLoading || customers.isLoading

  return (
        <div className="space-y-6 min-w-0">
          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="factory-light-card p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="factory-heading mb-2 flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                  Business Overview
                </h1>
                <p className="factory-subheading">
                  Live position across procurement, production, inventory and sales
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-500" />
                <div>
                  <div className="text-sm font-bold text-green-600">Live</div>
                  <div className="text-xs text-gray-500">Auto-refreshed</div>
                </div>
              </div>
            </div>
          </div>

          {dashboardLoadError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-semibold">Could not load: {failedDashboardModules.join(', ')}</p>
                  <p className="mt-1 whitespace-pre-line">{dashboardLoadError}</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Money headline ─────────────────────────────────────────── */}
          <div className="dashboard-stat-grid">
            <StatTile
              label="Total Revenue"
              value={money(metrics.totalRevenue)}
              icon={DollarSign}
              accent="var(--erp-series-3)"
              loading={metricsLoading}
            />
            <StatTile
              label="Net Profit"
              value={money(metrics.netProfit)}
              sublabel={`${metrics.profitMargin.toFixed(1)}% margin`}
              icon={TrendingUp}
              accent="var(--erp-series-1)"
              loading={metricsLoading}
            />
            <StatTile
              label="Stock Value"
              value={money(metrics.totalStockValue)}
              sublabel={`${metrics.totalStockQuantity.toLocaleString()} units on hand`}
              icon={Boxes}
              accent="var(--erp-series-6)"
              loading={metricsLoading}
            />
            <StatTile
              label="Outstanding Payables"
              value={money(purchaseStats?.totalOutstandingAmount ?? 0)}
              sublabel={`${(purchaseStats?.pendingApprovalCount ?? 0).toLocaleString()} awaiting approval`}
              icon={ClipboardList}
              accent="var(--erp-series-2)"
              loading={purchaseOrders.isLoading}
            />
          </div>

          {/* ── Volume counters ────────────────────────────────────────── */}
          <div className="dashboard-stat-grid">
            <StatTile
              label="Active Products"
              value={(productStats?.totalActiveProducts ?? 0).toLocaleString()}
              sublabel={money(productStats?.totalStockValue ?? 0) + ' stock value'}
              icon={Package}
              accent="var(--erp-series-1)"
              loading={products.isLoading}
              href="/dashboard/products"
            />
            <StatTile
              label="Raw Materials"
              value={(rawMaterialStats?.totalRawMaterials ?? 0).toLocaleString()}
              sublabel={money(rawMaterialStats?.totalStockValue ?? 0) + ' stock value'}
              icon={Factory}
              accent="var(--erp-series-2)"
              loading={rawMaterials.isLoading}
              href="/dashboard/raw-materials"
            />
            <StatTile
              label="Suppliers"
              value={(purchaseStats?.totalSuppliers ?? 0).toLocaleString()}
              sublabel={`${(purchaseStats?.activeSuppliers ?? 0).toLocaleString()} active`}
              icon={Truck}
              accent="var(--erp-series-3)"
              loading={purchaseOrders.isLoading}
              href="/dashboard/suppliers"
            />
            <StatTile
              label="Customers"
              value={(customerStats?.totalCustomers ?? 0).toLocaleString()}
              sublabel={`${(customerStats?.activeCustomers ?? 0).toLocaleString()} active`}
              icon={Users}
              accent="var(--erp-series-6)"
              loading={customers.isLoading}
              href="/dashboard/customers"
            />
          </div>

          {/* ── Pipelines (part-to-whole per domain) ───────────────────── */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
            <ChartCard
              title="Purchase Orders"
              href="/dashboard/purchases"
              description={`${(purchaseStats?.totalPurchaseOrders ?? 0).toLocaleString()} orders · ${money(
                purchaseStats?.totalPurchaseValue ?? 0,
              )}`}
            >
              <DonutChart
                centerLabel="orders"
                loading={purchaseOrders.isLoading}
                emptyMessage="No purchase orders yet"
                segments={[
                  { label: 'Draft', value: purchaseStats?.draftPurchaseOrders ?? 0 },
                  { label: 'Confirmed', value: purchaseStats?.confirmedPurchaseOrders ?? 0 },
                  { label: 'Partial', value: purchaseStats?.partialPurchaseOrders ?? 0 },
                  { label: 'Received', value: purchaseStats?.receivedPurchaseOrders ?? 0 },
                  { label: 'Cancelled', value: purchaseStats?.cancelledPurchaseOrders ?? 0 },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Production Orders"
              href="/dashboard/production-orders"
              description={`${(productionStats?.totalProductionOrders ?? 0).toLocaleString()} orders · ${money(
                productionStats?.totalProductionCost ?? 0,
              )}`}
            >
              <DonutChart
                centerLabel="orders"
                loading={productionOrders.isLoading}
                emptyMessage="No production orders yet"
                segments={[
                  { label: 'Draft', value: productionStats?.draftProductionOrders ?? 0 },
                  { label: 'In Progress', value: productionStats?.inProgressProductionOrders ?? 0 },
                  { label: 'Completed', value: productionStats?.completedProductionOrders ?? 0 },
                  { label: 'Cancelled', value: productionStats?.cancelledProductionOrders ?? 0 },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Goods Receipts"
              href="/dashboard/factory/receiving"
              description={`${(grnStats?.totalReceivedQuantity ?? 0).toLocaleString()} received · ${(
                grnStats?.totalRejectedQuantity ?? 0
              ).toLocaleString()} rejected`}
            >
              <DonutChart
                centerLabel="receipts"
                loading={grn.isLoading}
                emptyMessage="No goods receipts yet"
                segments={[
                  { label: 'Pending', value: grnStats?.pendingGrns ?? 0 },
                  { label: 'Inspecting', value: grnStats?.inspectingGrns ?? 0 },
                  { label: 'Approved', value: grnStats?.approvedGrns ?? 0 },
                  { label: 'Rejected', value: grnStats?.rejectedGrns ?? 0 },
                  { label: 'Completed', value: grnStats?.completedGrns ?? 0 },
                ]}
              />
            </ChartCard>

            <ChartCard
              title="Bills of Material"
              href="/dashboard/bom"
              description={`${(bomStats?.totalBoms ?? 0).toLocaleString()} recipes defined`}
            >
              <DonutChart
                centerLabel="recipes"
                loading={bom.isLoading}
                emptyMessage="No bills of material yet"
                segments={[
                  { label: 'Draft', value: bomStats?.draftBoms ?? 0 },
                  { label: 'Active', value: bomStats?.activeBoms ?? 0 },
                  { label: 'Inactive', value: bomStats?.inactiveBoms ?? 0 },
                ]}
              />
            </ChartCard>
          </div>

          {/* ── Operational rates (single-KPI dials) ───────────────────── */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <ChartCard
              title="Goods Acceptance Rate"
              description={`${goodsReceived.toLocaleString()} accepted · ${goodsRejected.toLocaleString()} rejected`}
            >
              <GaugeChart
                value={goodsAcceptanceRate}
                caption="received vs rejected"
                color="var(--erp-series-3)"
                loading={grn.isLoading}
              />
            </ChartCard>

            <ChartCard
              title="Production Completion"
              description={`${(productionStats?.completedProductionOrders ?? 0).toLocaleString()} of ${totalProductionCount.toLocaleString()} completed`}
            >
              <GaugeChart
                value={productionCompletionRate}
                caption="orders completed"
                color="var(--erp-series-1)"
                loading={productionOrders.isLoading}
              />
            </ChartCard>

            <ChartCard
              title="Active Suppliers"
              description={`${(purchaseStats?.activeSuppliers ?? 0).toLocaleString()} of ${totalSupplierCount.toLocaleString()} active`}
            >
              <GaugeChart
                value={activeSupplierRate}
                caption="supplier base engaged"
                color="var(--erp-series-6)"
                loading={purchaseOrders.isLoading}
              />
            </ChartCard>

            {/* Quality Pass Rate sits with the other rate dials (GET /dashboard/factory). */}
            <ChartCard
              title="Quality Pass Rate"
              description={`${(factoryMetrics?.passedInspections ?? 0).toLocaleString()} of ${(factoryMetrics?.totalQualityInspections ?? 0).toLocaleString()} inspections`}
            >
              <GaugeChart
                value={factoryMetrics?.qualityPassRate ?? 0}
                caption="inspections passed"
                color="var(--erp-series-3)"
                loading={factory.isLoading}
              />
            </ChartCard>
          </div>

          {/* ── Factory counts (GET /dashboard/factory) ──────────────────── */}
          <div className="dashboard-stat-grid lg:grid-cols-3">
            <StatTile
              label="Production Quantity"
              value={(factoryMetrics?.totalProductionQuantity ?? 0).toLocaleString()}
              sublabel="units produced"
              icon={Factory}
              loading={factory.isLoading}
            />
            <StatTile
              label="Total Waste"
              value={(factoryMetrics?.totalWaste ?? 0).toLocaleString()}
              sublabel="units wasted"
              accent="#d03b3b"
              loading={factory.isLoading}
            />
            <StatTile
              label="Quality Inspections"
              value={(factoryMetrics?.totalQualityInspections ?? 0).toLocaleString()}
              sublabel={`${(factoryMetrics?.passedInspections ?? 0).toLocaleString()} passed · ${(factoryMetrics?.failedInspections ?? 0).toLocaleString()} failed`}
              loading={factory.isLoading}
            />
          </div>

          {/* ── Business segments (multi-dimensional bubble) ───────────── */}
          <ChartCard
            title="Business Segments"
            description="Record count vs total value — bubble size is work still in flight"
          >
            <BubbleChart
              data={businessSegmentData}
              xLabel="Records"
              yLabel="Value"
              zLabel="In flight"
              formatY={money}
              loading={segmentsLoading}
              emptyMessage="No procurement, production or sales activity yet"
            />
          </ChartCard>

          {/* ── Ranked spend / balances ────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Top Suppliers by Spend"
              description="Total purchase value per supplier"
              action={
                <Link
                  href="/dashboard/suppliers"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View all
                </Link>
              }
            >
              <ColumnChart
                data={supplierSpendData}
                formatValue={money}
                formatLabel={formatCompact}
                loading={topSuppliers.isLoading}
                emptyMessage="No supplier spend recorded yet"
              />
            </ChartCard>

            <ChartCard
              title="Top Customers by Balance"
              description="Outstanding receivable per customer"
              action={
                <Link
                  href="/dashboard/customers"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View all
                </Link>
              }
            >
              <RankedBarChart
                data={customerBalanceData}
                formatValue={money}
                formatLabel={formatCompact}
                loading={customers.isLoading}
                emptyMessage="No customer balances yet"
              />
            </ChartCard>
          </div>

          {/* ── Inventory health (reserved status colours) ─────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Product Stock Health"
              description="Items needing attention"
              action={
                <Link
                  href="/dashboard/stock/reorder"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Reorder
                </Link>
              }
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <HealthStat
                  label="Low stock"
                  value={productStats?.lowStockCount ?? 0}
                  tone="warning"
                  icon={AlertTriangle}
                />
                <HealthStat
                  label="Out of stock"
                  value={productStats?.outOfStockCount ?? 0}
                  tone="critical"
                  icon={PackageX}
                />
              </div>
            </ChartCard>

            <ChartCard
              title="Raw Material Health"
              description="Shortages and expiring batches"
              action={
                <Link
                  href="/dashboard/raw-materials"
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  View all
                </Link>
              }
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <HealthStat
                  label="Low stock"
                  value={rawMaterialStats?.lowStockCount ?? 0}
                  tone="warning"
                  icon={AlertTriangle}
                />
                <HealthStat
                  label="Out of stock"
                  value={rawMaterialStats?.outOfStockCount ?? 0}
                  tone="critical"
                  icon={PackageX}
                />
                <HealthStat
                  label="Expiring soon"
                  value={rawMaterialStats?.expiringBatchesCount ?? 0}
                  tone="warning"
                  icon={CalendarClock}
                />
              </div>
            </ChartCard>
          </div>

          {/* ── Recent activity ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-gray-900">
                      <Package className="mr-3 h-6 w-6 text-blue-600" />
                      Recent Stock Activity
                    </CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                      Latest stock movements and updates
                    </CardDescription>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Activity className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stockLoading ? (
                    <div className="h-40 w-full animate-pulse rounded bg-gray-100" />
                  ) : stockBalances.length > 0 ? (
                    stockBalances.slice(0, 5).map((balance: any, index: number) => (
                      <Link
                        key={balance.id || index}
                        href={`/dashboard/stock/balances?productId=${balance.productId}`}
                      >
                        <div className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                              <Package className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {balance.product?.name || 'Unknown Product'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {balance.location?.name || 'Unknown Location'} • Qty: {balance.quantity}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {money((balance.product?.price || 0) * balance.quantity)}
                            </p>
                            <p className="text-xs text-gray-500">Value</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-600">No stock data available</p>
                      <Link href="/dashboard/stock">
                        <Button className="factory-button-primary mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          View Stock
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="factory-light-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center text-gray-900">
                      <ShoppingCart className="mr-3 h-6 w-6 text-cyan-600" />
                      Recent Purchases
                    </CardTitle>
                    <CardDescription className="mt-1 text-gray-600">
                      Latest purchase orders and transactions
                    </CardDescription>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100">
                    <Truck className="h-6 w-6 text-cyan-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {purchasesLoading ? (
                    <div className="h-40 w-full animate-pulse rounded bg-gray-100" />
                  ) : purchases.length > 0 ? (
                    purchases.slice(0, 5).map((purchase: any, index: number) => (
                      <Link
                        key={purchase.id || index}
                        href={`/dashboard/purchases/invoice/${purchase.id}`}
                      >
                        <div className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm">
                          <div className="flex items-center space-x-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-100">
                              <ShoppingCart className="h-5 w-5 text-cyan-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {purchase.invoiceNumber || purchase.orderNumber || `Purchase #${index + 1}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {purchase.supplier?.name || 'Unknown Supplier'} • {purchase.status || 'PENDING'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">
                              {money(purchase.totalAmount || 0)}
                            </p>
                            <p className="text-xs text-gray-500">Total</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <ShoppingCart className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="font-medium text-gray-600">No purchases found</p>
                      <Link href="/dashboard/purchases">
                        <Button className="factory-button-primary mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Purchase
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Quick actions ─────────────────────────────────────────── */}
          <Card className="factory-light-card">
            <CardHeader>
              <CardTitle className="flex items-center text-gray-900">
                <Activity className="mr-3 h-6 w-6 text-blue-600" />
                Quick Actions
              </CardTitle>
              <CardDescription className="mt-1 text-gray-600">
                Common inventory management tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {[
                  {
                    href: '/dashboard/products',
                    icon: Package,
                    iconClass: 'text-blue-600',
                    bgClass: 'bg-blue-50',
                    title: 'Manage Products',
                    subtitle: 'View and manage all products',
                  },
                  {
                    href: '/dashboard/purchases',
                    icon: ShoppingCart,
                    iconClass: 'text-cyan-600',
                    bgClass: 'bg-cyan-50',
                    title: 'Manage Purchases',
                    subtitle: 'View and create purchases',
                  },
                  {
                    href: '/dashboard/stock',
                    icon: TrendingUp,
                    iconClass: 'text-green-600',
                    bgClass: 'bg-green-50',
                    title: 'View Stock',
                    subtitle: 'Check stock levels and balances',
                  },
                ].map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:bg-gray-50 hover:shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-2 ${action.bgClass}`}>
                          <action.icon className={`h-5 w-5 ${action.iconClass}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-semibold text-gray-900">{action.title}</div>
                          <div className="text-sm text-gray-500">{action.subtitle}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
  )
}
