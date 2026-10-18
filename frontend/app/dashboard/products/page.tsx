'use client'

import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-provider'
import { formatCurrency } from '@/lib/currency'
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useProducts, useDeleteProduct, useToggleProductActive } from '@/hooks/useProducts'
import type { Product } from '@/types/common'

const TYPE_LABELS: Record<string, string> = {
  FINISHED_GOOD: 'Finished Good',
  SEMI_FINISHED: 'Semi-Finished',
  CONSUMABLE: 'Consumable',
  SERVICE: 'Service',
}

function StockBadge({ product }: { product: Product }) {
  const stock = product.currentStock ?? 0
  if (stock <= 0) return <Badge variant="destructive" className="whitespace-nowrap">Out of Stock</Badge>
  if (stock <= (product.reorderLevel ?? 0)) return <Badge className="bg-amber-100 text-amber-800 border-amber-200 whitespace-nowrap">Low Stock ({stock})</Badge>
  if (product.maxStock && stock > product.maxStock) return <Badge className="bg-purple-100 text-purple-800 border-purple-200 whitespace-nowrap">Over Stock ({stock})</Badge>
  if (product.maxStock && stock === product.maxStock) return <Badge className="bg-blue-100 text-blue-800 border-blue-200 whitespace-nowrap">At Capacity ({stock})</Badge>
  return <span className="text-gray-700">{stock}</span>
}

export default function ProductsPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const controller = useDataTable()

  const { data: resp, isLoading, isError } = useProducts({ ...(controller.queryParams as any) })

  const deleteMutation = useDeleteProduct()
  const toggleMutation = useToggleProductActive()

  const products: Product[] = resp?.data ?? []
  const meta = resp?.meta ?? null

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Product', description: 'Are you sure you want to delete this product?', confirmLabel: 'Delete' })) {
      try {
        await deleteMutation.mutateAsync(id)
      } catch {
        // Success/failure toasts (including the API error message) are surfaced
        // by the useDeleteProduct hook; swallow the rejection so it doesn't
        // bubble up as an unhandled error that masks the toast.
      }
    }
  }

  // Both filters map to backend query params supported by ProductsQueryDto
  // (`type` enum and `isActive` boolean — the DTO transforms "true"/"false").
  const filters: DataTableFilter<Product>[] = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'FINISHED_GOOD', label: 'Finished Good' },
        { value: 'SEMI_FINISHED', label: 'Semi-Finished' },
        { value: 'CONSUMABLE', label: 'Consumable' },
        { value: 'SERVICE', label: 'Service' },
      ],
    },
    {
      key: 'isActive',
      label: 'Status',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' },
      ],
    },
  ]

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (p) => <span className="font-medium text-gray-700 font-mono text-xs">{p.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (p) => <span className="font-medium text-gray-900">{p.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      sortKey: 'type',
      render: (p) => (
        <div className="flex justify-center">
          <Badge variant="outline" className="text-xs text-center justify-center">{TYPE_LABELS[p.type] ?? p.type}</Badge>
        </div>
      ),
    },
    {
      key: 'uom',
      header: 'UOM',
      sortable: true,
      sortKey: 'uom.name',
      render: (p) => <span className="text-gray-600">{p.uom?.symbol ?? p.uom?.name ?? '—'}</span>,
    },
    {
      key: 'sellingPrice',
      header: 'Selling Price',
      align: 'right',
      sortable: true,
      sortKey: 'sellingPrice',
      render: (p) => (
        <span className="font-medium text-gray-900">
          {p.sellingPrice ? formatCurrency(Number(p.sellingPrice)) : '—'}
        </span>
      ),
    },
    {
      key: 'currentStock',
      header: 'Stock',
      align: 'right',
      sortable: true,
      sortKey: 'currentStock',
      render: (p) => (
        <div className="flex justify-end items-center">
          <StockBadge product={p} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      sortKey: 'isActive',
      render: (p) => (
        <div className="flex justify-center items-center">
          {p.isActive ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 whitespace-nowrap">Active</Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 whitespace-nowrap">Inactive</Badge>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Products</h2>
          <p className="text-gray-500">Manage finished goods, semi-finished items, consumables, and services.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push('/dashboard/products/add')} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Product>
            columns={columns}
            data={products}
            meta={meta}
            controller={controller}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            isError={isError}
            searchable
            searchPlaceholder="Search products..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No products found matching your criteria."
            onRowClick={(p) => router.push(`/dashboard/products/${p.id}`)}
            actions={(product) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/products/${product.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> View / Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => toggleMutation.mutate(product.id)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    {product.isActive
                      ? <><ToggleLeft className="mr-2 h-4 w-4" /> Deactivate</>
                      : <><ToggleRight className="mr-2 h-4 w-4" /> Activate</>
                    }
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(product.id)}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
