'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Search, FileText, Loader2, Activity } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TableSort } from '@/components/ui/table-sort'
import { useAuditLogs, useAuditSummary, type AuditAction } from '@/hooks/useAuditLogs'
import { ActionBadge, AuditDiff } from '@/components/audit/entity-history'

const ACTIONS: AuditAction[] = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT', 'RESTORE']
const MODULES = [
  'PRODUCTS', 'RAW_MATERIALS', 'RAW_MATERIAL_BATCHES', 'SITES', 'CATEGORIES', 'SUPPLIERS', 'CUSTOMERS',
  'PURCHASE_ORDERS', 'PURCHASE_RETURNS', 'GRN', 'PRODUCTION_ORDERS', 'BOM', 'UOM', 'USERS', 'AUTH',
  'WASTE_MANAGEMENT', 'EXPENSES', 'INVOICES',
]

export default function AuditLogsPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC')
  const [page, setPage] = useState(1)

  const { data: summary } = useAuditSummary()
  const { data, isLoading } = useAuditLogs({
    search: search || undefined,
    action: action !== 'all' ? (action as AuditAction) : undefined,
    module: moduleFilter !== 'all' ? moduleFilter : undefined,
    fromDate: fromDate || undefined,
    // Extend the "To" bound to end-of-day so a same-day upper bound includes
    // that day's entries instead of stopping at midnight.
    toDate: toDate ? `${toDate}T23:59:59.999` : undefined,
    sortBy,
    sortOrder,
    page,
    limit: 25,
  })

  const logs = data?.logs ?? []

  // Whether any list filter (excluding sort/pagination) is active. When it is,
  // the Total card reflects the FILTERED result count (data.total) rather than
  // the global summary (#25), and the action cards reflect the filtered rows (#7).
  const isFiltered =
    !!search || action !== 'all' || moduleFilter !== 'all' || !!fromDate || !!toDate
  const totalLabel = isFiltered ? 'Filtered' : 'Total'
  const totalCount = isFiltered ? (data?.total ?? 0) : (summary?.totalLogs ?? 0)

  // Action summary cards: when a filter is active, derive per-action counts from
  // the filtered result rows so the cards track the active query (#7); otherwise
  // use the server-wide summary. Mirrors the PO filter-aware cards.
  const filteredByAction = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const l of logs) counts[l.action] = (counts[l.action] ?? 0) + 1
    return counts
  }, [logs])
  const byActionSource = isFiltered ? filteredByAction : (summary?.byAction ?? {})
  const topActions = Object.entries(byActionSource).sort((a, b) => b[1] - a[1]).slice(0, 4)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <FileText className="h-8 w-8 text-green-600" /> Audit Logs
        </h2>
        <p className="text-gray-500">Every create, update, delete, and approval across the system.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className={isFiltered ? 'border-green-500 ring-1 ring-green-500/40' : undefined}><CardContent className="pt-6"><p className="text-sm text-gray-500 flex items-center gap-1"><Activity className="h-4 w-4" /> {totalLabel}</p><p className="text-2xl font-bold">{totalCount}</p></CardContent></Card>
        {topActions.map(([act, count]) => (
          <Card key={act}><CardContent className="pt-6"><p className="text-sm text-gray-500">{act}</p><p className="text-2xl font-bold">{count}</p></CardContent></Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input placeholder="Search entity / label…" className="pl-8" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <Select value={action} onValueChange={v => { setAction(v); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={moduleFilter} onValueChange={v => { setModuleFilter(v); setPage(1) }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {MODULES.map(m => <SelectItem key={m} value={m}>{m.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">From</span>
          <Input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }} className="w-[150px]" title="From date" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">To</span>
          <Input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }} className="w-[150px]" title="To date" />
        </div>
        <TableSort
          columns={[
            { value: 'createdAt', label: 'Time' },
            { value: 'action', label: 'Action' },
            { value: 'entityName', label: 'Entity' },
            { value: 'module', label: 'Module' },
          ]}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onChange={(by, ord) => { setSortBy(by); setSortOrder(ord); setPage(1) }}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-28 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-28 text-center text-gray-500">No audit logs found</TableCell></TableRow>
              ) : logs.map(log => (
                <TableRow key={log.id} className="align-top">
                  <TableCell className="text-gray-600 text-sm whitespace-nowrap">{format(new Date(log.createdAt), 'MMM dd, HH:mm:ss')}</TableCell>
                  <TableCell className="font-medium text-gray-900">{log.actor?.name ?? 'System'}<span className="block text-xs text-gray-500">{log.actor?.email}</span></TableCell>
                  <TableCell><ActionBadge action={log.action} /></TableCell>
                  <TableCell className="text-gray-700">
                    <Badge variant="outline" className="text-[10px]">{log.module.replace(/_/g, ' ')}</Badge>
                    {log.entityLabel && <span className="block text-xs text-gray-500 mt-1">{log.entityLabel}</span>}
                  </TableCell>
                  <TableCell className="max-w-[360px]"><AuditDiff log={log} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{data.total} total · page {data.page} of {data.totalPages || 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={data.page <= 1}>Previous</Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={data.page >= (data.totalPages || 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
