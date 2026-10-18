'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/currency'

type Asset = {
  id: string
  assetName: string
  cost: number
  usefulLife: number
  depreciationMethod: string
  bookValue: number
}

export default function FixedAssetsPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<Asset[]>([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get<any>('/assets')
      const payload: Asset[] = res.data.data || res.data
      setItems(Array.isArray(payload) ? payload : [])
    } catch (e) {
      console.error(e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter((a) => a.assetName.toLowerCase().includes(q) || a.depreciationMethod.toLowerCase().includes(q))
  }, [search, items])

  const remove = async (id: string) => {
    if (!confirm('Delete asset?')) return
    try {
      await apiClient.delete(`/assets/${id}`)
      setItems((prev) => prev.filter((x) => x.id !== id))
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to delete asset')
    }
  }

  const fmt = (n: number) => formatCurrency(Number(n || 0))

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Fixed Assets</h2>
          <p className="text-gray-500">Track assets and current book value.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/financial/fixed-assets/depreciation/run"><Button variant="outline">Run Depreciation</Button></Link>
          <Link href="/dashboard/financial/fixed-assets/new">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="mr-2 h-4 w-4" /> Add Asset</Button>
          </Link>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Assets</CardTitle>
          <CardDescription>Active fixed assets only.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 bg-gray-50 border-gray-200" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." />
          </div>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Book Value</TableHead>
                  <TableHead>Life (months)</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assets found.</TableCell></TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{a.assetName}</TableCell>
                      <TableCell>{fmt(a.cost)}</TableCell>
                      <TableCell className="font-medium">{fmt(a.bookValue)}</TableCell>
                      <TableCell>{a.usefulLife}</TableCell>
                      <TableCell><Badge variant="secondary">{a.depreciationMethod}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/financial/fixed-assets/${a.id}/edit`}>
                            <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => remove(a.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

