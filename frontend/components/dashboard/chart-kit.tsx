'use client'

import { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import Link from 'next/link'

/**
 * Shared building blocks for the dashboard.
 *
 * Colour rules that must not drift:
 *  - Categorical slots are consumed in fixed order (slot 1, 2, 3 …). They are
 *    never cycled and never re-assigned by rank, so a segment keeps its colour
 *    when the underlying counts change.
 *  - The status palette (good/warning/critical) is reserved for real health
 *    states and is never reused as a chart series.
 *  - Slots 3 and 4 fall below 3:1 against the card surface, so every chart here
 *    carries visible labels (legend counts, values on bars) rather than relying
 *    on colour alone.
 */

// NOTE: these must be REAL colour values, not `var(--erp-*)`. recharts applies
// them as SVG presentation attributes (fill/stroke), and CSS var() is only valid
// in CSS property values (style=), NOT in SVG attributes — so a var() fill
// silently renders nothing (the bars/pie sectors/bubbles were invisible). The
// hex values mirror the :root palette in globals.css.
const SERIES_SLOTS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#4a3aa7', // violet
]

const INK_SECONDARY = '#52514e'
const CHART_GRID = '#e1e0d9'

// Short axis-tick label for large numbers (2.4M / 600K) so long currency
// strings don't overflow a narrow axis and get their leading digit clipped.
function compactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (abs >= 1_000) return `${Math.round(value / 1_000)}K`
  return `${value}`
}

// ──────────────────────────────── Card shell ────────────────────────────────

export function ChartCard({
  title,
  description,
  action,
  href,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  href?: string
  children: ReactNode
}) {
  const card = (
    <Card className="factory-light-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">{title}</CardTitle>
            {description && <p className="mt-1 text-xs text-gray-500">{description}</p>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )

  return href ? (
    <Link href={href} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
      {card}
    </Link>
  ) : card
}

// ───────────────────────────────── Stat tiles ─────────────────────────────────

/**
 * A single headline number. `emphasis` renders the hero figure the dashboard
 * leads with — one per screen, not one per tile.
 */
export function StatTile({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = SERIES_SLOTS[0],
  emphasis = false,
  loading = false,
  href,
}: {
  label: string
  value: string | number
  sublabel?: string
  icon?: LucideIcon
  accent?: string
  emphasis?: boolean
  loading?: boolean
  href?: string
}) {
  const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value)
  const valueLength = displayValue.length
  const valueSizeClass =
    valueLength > 14
      ? 'text-base sm:text-lg'
      : valueLength > 10
        ? 'text-lg sm:text-xl'
        : 'text-xl sm:text-2xl'

  const tile = (
    <Card
      className={`factory-light-card h-full min-h-[9.5rem] border transition-shadow hover:shadow-md ${
        emphasis ? 'ring-1 ring-inset ring-gray-200' : ''
      }`}
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-h-[2rem] text-xs font-semibold uppercase tracking-wide text-gray-500 line-clamp-2">
            {label}
          </p>
          {Icon && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, transparent)` }}
            >
              <Icon className="h-5 w-5" style={{ color: accent }} />
            </span>
          )}
        </div>

        <div className="mt-auto flex min-h-[3rem] flex-col justify-end">
          {loading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-gray-200" />
          ) : (
            <p
              className={`h-8 truncate font-bold leading-8 tabular-nums text-gray-900 ${valueSizeClass}`}
              title={displayValue}
            >
              {displayValue}
            </p>
          )}
          {sublabel && !loading ? (
            <p className="mt-1 min-h-[2rem] line-clamp-2 text-xs text-gray-500" title={sublabel}>
              {sublabel}
            </p>
          ) : (
            <p className="mt-1 min-h-[2rem]" aria-hidden="true" />
          )}
        </div>
      </CardContent>
    </Card>
  )

  return href ? (
    <Link
      href={href}
      className="block h-full min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      {tile}
    </Link>
  ) : (
    <div className="h-full min-w-0">{tile}</div>
  )
}

// ──────────────────────────────── Status rail ────────────────────────────────

export interface RailSegment {
  label: string
  value: number
}

/**
 * Part-to-whole across a pipeline's statuses, drawn as one horizontal stacked
 * bar with a 2px surface gap between fills. A legend always accompanies it, so
 * identity is carried by label + count and never by colour alone.
 */
export function StatusRail({
  segments,
  loading = false,
}: {
  segments: RailSegment[]
  loading?: boolean
}) {
  const total = segments.reduce((sum, segment) => sum + (segment.value || 0), 0)

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-gray-200" />
        <div className="h-12 w-full animate-pulse rounded bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-gray-100">
        {total === 0 ? (
          <div className="h-full w-full bg-gray-100" />
        ) : (
          segments.map((segment, index) =>
            segment.value > 0 ? (
              <div
                key={segment.label}
                title={`${segment.label}: ${segment.value.toLocaleString()}`}
                className="h-full rounded-[2px] transition-opacity hover:opacity-75"
                style={{
                  width: `${(segment.value / total) * 100}%`,
                  backgroundColor: SERIES_SLOTS[index % SERIES_SLOTS.length],
                }}
              />
            ) : null,
          )
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((segment, index) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: SERIES_SLOTS[index % SERIES_SLOTS.length] }}
            />
            <span className="truncate text-gray-600">{segment.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-gray-900">
              {(segment.value || 0).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────── Ranked bar chart ───────────────────────────────

export interface RankedItem {
  name: string
  value: number
}

/**
 * Magnitude comparison across a handful of named entities (top suppliers,
 * top customers). One series, so one hue and no legend — the title names it,
 * and each bar is labelled with its own value.
 */
export function RankedBarChart({
  data,
  formatValue,
  formatLabel,
  emptyMessage = 'No data yet',
  loading = false,
}: {
  data: RankedItem[]
  /** Exact value shown in the tooltip. */
  formatValue: (value: number) => string
  /** Short value printed beside each bar; falls back to the exact format. */
  formatLabel?: (value: number) => string
  emptyMessage?: string
  loading?: boolean
}) {
  const labelFormatter = formatLabel ?? formatValue
  if (loading) {
    return <div className="h-[220px] w-full animate-pulse rounded bg-gray-100" />
  }

  if (!data.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 88, bottom: 4, left: 0 }}>
        <CartesianGrid horizontal={false} stroke={CHART_GRID} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SECONDARY, fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0]
            return (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                <p className="font-medium text-gray-900">{(point.payload as RankedItem)?.name}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-gray-700">
                  {formatValue(Number(point.value) || 0)}
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="value" fill={SERIES_SLOTS[0]} radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: ReactNode) => labelFormatter(Number(value) || 0)}
            style={{ fill: INK_SECONDARY, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─────────────────────────────── Column chart ───────────────────────────────

/**
 * Vertical column chart for magnitude comparison across a handful of named
 * entities (e.g. top suppliers by spend). Reads like the classic column chart:
 * the entity name sits on the X axis, its value climbs the Y axis, and every
 * column is topped with its own value so the exact figure is never hidden.
 * One series, so one hue and no legend — the card title names it.
 */
export function ColumnChart({
  data,
  formatValue,
  formatLabel,
  emptyMessage = 'No data yet',
  loading = false,
}: {
  data: RankedItem[]
  /** Exact value shown in the tooltip and on the axis. */
  formatValue: (value: number) => string
  /** Short value printed above each column and on Y-axis ticks; falls back to the exact format. */
  formatLabel?: (value: number) => string
  emptyMessage?: string
  loading?: boolean
}) {
  const labelFormatter = formatLabel ?? formatValue

  if (loading) {
    return <div className="h-[300px] w-full animate-pulse rounded bg-gray-100" />
  }

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 24, right: 12, bottom: 4, left: 4 }}>
        <CartesianGrid vertical={false} stroke={CHART_GRID} />
        <XAxis
          dataKey="name"
          interval={0}
          height={64}
          angle={-18}
          textAnchor="end"
          tickLine={false}
          axisLine={{ stroke: CHART_GRID }}
          tick={{ fill: INK_SECONDARY, fontSize: 11 }}
        />
        <YAxis
          width={56}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SECONDARY, fontSize: 11 }}
          tickFormatter={(value: number) => labelFormatter(Number(value) || 0)}
        />
        <Tooltip
          cursor={{ fill: 'rgba(11,11,11,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0]
            return (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                <p className="font-medium text-gray-900">{(point.payload as RankedItem)?.name}</p>
                <p className="mt-0.5 font-semibold tabular-nums text-gray-700">
                  {formatValue(Number(point.value) || 0)}
                </p>
              </div>
            )
          }}
        />
        <Bar dataKey="value" fill={SERIES_SLOTS[0]} radius={[4, 4, 0, 0]} maxBarSize={64} isAnimationActive={false}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: ReactNode) => labelFormatter(Number(value) || 0)}
            style={{ fill: INK_SECONDARY, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─────────────────────────────── Health indicator ───────────────────────────────

type HealthTone = 'good' | 'warning' | 'critical'

const HEALTH_COLORS: Record<HealthTone, string> = {
  good: '#0ca30c',
  warning: '#fab219',
  critical: '#d03b3b',
}

/** A real health state — always icon + label + value, never colour alone. */
export function HealthStat({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string
  value: number
  tone: HealthTone
  icon: LucideIcon
}) {
  const color = HEALTH_COLORS[tone]

  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2.5">
      <Icon className="h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
      <span className="truncate text-xs text-gray-600">{label}</span>
      <span className="ml-auto text-sm font-bold tabular-nums" style={{ color }}>
        {value.toLocaleString()}
      </span>
    </div>
  )
}

// ─────────────────────────────────── Donut chart ───────────────────────────────────

export interface DonutSegment {
  label: string
  value: number
}

/**
 * Part-to-whole distribution across a small set of categories (order statuses,
 * recipe states). Drawn as a donut so the running total sits in the hole, paired
 * with a legend that always carries label + count + share — identity never rests
 * on colour alone. Slot colours are assigned by segment position and never cycle,
 * so a category keeps its hue as the counts move.
 */
export function DonutChart({
  segments,
  centerLabel,
  formatValue = (value: number) => value.toLocaleString(),
  emptyMessage = 'No data yet',
  loading = false,
}: {
  segments: DonutSegment[]
  centerLabel?: string
  /** Formats the centre total and the tooltip figure. */
  formatValue?: (value: number) => string
  emptyMessage?: string
  loading?: boolean
}) {
  const total = segments.reduce((sum, segment) => sum + (segment.value || 0), 0)

  if (loading) {
    return <div className="h-[220px] w-full animate-pulse rounded bg-gray-100" />
  }

  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  // Only positive slices are drawn, but each keeps the colour of its original
  // position so the ring and the legend always agree.
  const slices = segments
    .map((segment, index) => ({ ...segment, color: SERIES_SLOTS[index % SERIES_SLOTS.length] }))
    .filter((slice) => slice.value > 0)

  return (
    <div className="space-y-3">
      <div className="relative">
        <ResponsiveContainer width="100%" height={168}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="62%"
              outerRadius="86%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {slices.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              // The donut is small, so a cursor-following tooltip would sit on top
              // of the centre total. Let it escape the chart box and push it clear
              // of the cursor so it never overlaps the centre label.
              allowEscapeViewBox={{ x: true, y: true }}
              offset={16}
              wrapperStyle={{ zIndex: 50 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const slice = payload[0].payload as DonutSegment
                const share = total > 0 ? (slice.value / total) * 100 : 0
                return (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-medium text-gray-900">{slice.label}</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-gray-700">
                      {formatValue(slice.value)} · {share.toFixed(0)}%
                    </p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* The hole carries the running total so the ring reads as a whole. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-gray-900">{formatValue(total)}</span>
          {centerLabel && <span className="text-[11px] text-gray-500">{centerLabel}</span>}
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((segment, index) => {
          const share = total > 0 ? (segment.value / total) * 100 : 0
          return (
            <li key={segment.label} className="flex items-center gap-2 text-xs">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: SERIES_SLOTS[index % SERIES_SLOTS.length] }}
              />
              <span className="truncate text-gray-600">{segment.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-gray-900">
                {(segment.value || 0).toLocaleString()}
                <span className="ml-1 font-normal text-gray-400">{share.toFixed(0)}%</span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─────────────────────────────────── Gauge chart ───────────────────────────────────

/**
 * A single rate measured against its natural 0–100% ceiling (goods accepted,
 * orders completed). Drawn as a 270° radial dial with the exact percentage in
 * the middle, so one glance gives both the fill and the figure. The accent is a
 * categorical slot, never a reserved health colour.
 */
export function GaugeChart({
  value,
  caption,
  color = SERIES_SLOTS[0],
  loading = false,
}: {
  /** Progress as a percentage, 0–100. Out-of-range values are clamped. */
  value: number
  caption?: string
  color?: string
  loading?: boolean
}) {
  if (loading) {
    return <div className="h-[180px] w-full animate-pulse rounded bg-gray-100" />
  }

  const clamped = Math.max(0, Math.min(100, Math.round(value)))
  const data = [{ name: 'value', value: clamped }]

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full">
        <ResponsiveContainer width="100%" height={168}>
          <RadialBarChart
            data={data}
            startAngle={225}
            endAngle={-45}
            innerRadius="70%"
            outerRadius="100%"
            barSize={16}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              fill={color}
              background={{ fill: CHART_GRID }}
              cornerRadius={8}
              isAnimationActive={false}
            />
          </RadialBarChart>
        </ResponsiveContainer>

        {/* Only the % sits inside the arc — a wide caption here would overlap the
            ring's lower ends, so the caption renders below the gauge instead. */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-gray-900">{clamped}%</span>
        </div>
      </div>

      {caption && <span className="mt-1 px-2 text-center text-xs text-gray-500">{caption}</span>}
    </div>
  )
}

// ─────────────────────────────────── Bubble chart ───────────────────────────────────

export interface BubblePoint {
  name: string
  x: number
  y: number
  z: number
}

/**
 * A three-variable comparison across a few named entities: position on the X and
 * Y axes plus bubble area for a third measure. Reads as the classic bubble chart —
 * e.g. business areas by record count (X), value (Y) and work in progress (size).
 * Each entity keeps a fixed slot colour and is labelled on the plot, so identity
 * never rests on colour alone.
 */
export function BubbleChart({
  data,
  xLabel,
  yLabel,
  zLabel,
  formatX = (value: number) => value.toLocaleString(),
  formatY = (value: number) => value.toLocaleString(),
  formatZ = (value: number) => value.toLocaleString(),
  emptyMessage = 'No data yet',
  loading = false,
}: {
  data: BubblePoint[]
  xLabel: string
  yLabel: string
  zLabel: string
  formatX?: (value: number) => string
  formatY?: (value: number) => string
  formatZ?: (value: number) => string
  emptyMessage?: string
  loading?: boolean
}) {
  if (loading) {
    return <div className="h-[300px] w-full animate-pulse rounded bg-gray-100" />
  }

  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
        {emptyMessage}
      </div>
    )
  }

  const points = data.map((point, index) => ({
    ...point,
    color: SERIES_SLOTS[index % SERIES_SLOTS.length],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ top: 28, right: 48, bottom: 28, left: 8 }}>
        <CartesianGrid stroke={CHART_GRID} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          // Pad the axis past the largest point so an edge bubble and its label
          // aren't clipped at the right border.
          domain={[0, (dataMax: number) => Math.ceil((dataMax || 0) + 2)]}
          allowDecimals={false}
          tickLine={false}
          axisLine={{ stroke: CHART_GRID }}
          tick={{ fill: INK_SECONDARY, fontSize: 11 }}
          tickFormatter={(value: number) => formatX(Number(value) || 0)}
          label={{
            value: xLabel,
            position: 'insideBottom',
            offset: -14,
            fill: INK_SECONDARY,
            fontSize: 11,
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          width={52}
          domain={[0, (dataMax: number) => Math.ceil((dataMax || 0) * 1.12)]}
          tickLine={false}
          axisLine={false}
          tick={{ fill: INK_SECONDARY, fontSize: 11 }}
          // Compact ticks (2.4M / 600K) so the label fits the axis width — the
          // full currency string was too long and its leading digit got clipped.
          tickFormatter={(value: number) => compactNumber(Number(value) || 0)}
        />
        <ZAxis type="number" dataKey="z" range={[220, 1400]} name={zLabel} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3', stroke: CHART_GRID }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const point = payload[0].payload as BubblePoint
            return (
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
                <p className="font-medium text-gray-900">{point.name}</p>
                <p className="mt-0.5 tabular-nums text-gray-600">
                  {xLabel}: {formatX(point.x)}
                </p>
                <p className="tabular-nums text-gray-600">
                  {yLabel}: {formatY(point.y)}
                </p>
                <p className="tabular-nums text-gray-600">
                  {zLabel}: {formatZ(point.z)}
                </p>
              </div>
            )
          }}
        />
        <Scatter data={points} isAnimationActive={false}>
          {points.map((point) => (
            <Cell key={point.name} fill={point.color} fillOpacity={0.72} stroke={point.color} />
          ))}
          <LabelList
            dataKey="name"
            position="top"
            style={{ fill: INK_SECONDARY, fontSize: 11, fontWeight: 600 }}
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}
