'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useProduct, useToggleProductActive } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/currency'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import type { Product } from '@/types/common'

const TYPE_LABELS: Record<string, string> = {
  FINISHED_GOOD: 'Finished Good',
  SEMI_FINISHED: 'Semi-Finished',
  CONSUMABLE: 'Consumable',
  SERVICE: 'Service',
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: product, isLoading } = useProduct(id)
  const toggleMutation = useToggleProductActive()

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!product) return <div className="p-8 text-muted-foreground">Product not found</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{product.name}</h2>
          <p className="text-muted-foreground font-mono text-sm">{product.code}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => toggleMutation.mutate(product.id)}
          disabled={toggleMutation.isPending}
        >
          {product.isActive
            ? <><ToggleRight className="h-4 w-4 mr-2 text-green-600" />Active</>
            : <><ToggleLeft className="h-4 w-4 mr-2 text-gray-400" />Inactive</>
          }
        </Button>
        <Button onClick={() => router.push(`/dashboard/products/${id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>
        <ViewHistoryButton entityName="Product" entityId={id} size="default" />
      </div>

      <div>
        <Card>
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Type</p>
              <Badge variant="outline">{TYPE_LABELS[product.type] ?? product.type}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">UOM</p>
              <p className="font-medium">
                {product.uom?.name ?? '—'}
                {product.uom?.symbol ? ` (${product.uom.symbol})` : ''}
              </p>
            </div>
            {product.barcode && (
              <div>
                <p className="text-muted-foreground">Barcode</p>
                <p className="font-mono">{product.barcode}</p>
              </div>
            )}
            {product.sellingPrice && (
              <div>
                <p className="text-muted-foreground">Selling Price</p>
                <p className="font-medium">{formatCurrency(Number(product.sellingPrice))}</p>
              </div>
            )}
            {product.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p>{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {product.images && product.images.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Images</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {product.images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`${product.name} ${i + 1}`}
                className="h-24 w-24 rounded object-cover border"
              />
            ))}
          </CardContent>
        </Card>
      )}

      {product.attributes && product.attributes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Attributes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Unit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.attributes.map(attr => (
                  <TableRow key={attr.id}>
                    <TableCell className="font-medium">{attr.name}</TableCell>
                    <TableCell>{attr.value}</TableCell>
                    <TableCell className="text-muted-foreground">{attr.unit ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
