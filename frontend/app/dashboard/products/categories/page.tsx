'use client'

import { useState } from 'react'
import { useConfirm } from '@/components/ui/confirm-provider'
import { Plus, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { useCategories, useCreateCategory, useDeleteCategory } from '@/hooks/useMasterData'
import { useForm } from 'react-hook-form'

interface CreateCategoryForm {
  name: string
  code: string
}

interface CategoryRow {
  id: string
  name: string
  code: string
}

export default function CategoriesPage() {
  const confirm = useConfirm()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data: categories, isLoading, isError } = useCategories()
  const createMutation = useCreateCategory()
  const deleteMutation = useDeleteCategory()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCategoryForm>()

  const paged = applyClientPaging<CategoryRow>((categories as CategoryRow[]) ?? [], controller, {
    search: (c) => `${c.name} ${c.code}`,
    sort: {
      name: (c) => c.name?.toLowerCase(),
      code: (c) => c.code?.toLowerCase(),
    },
  })

  const onSubmit = async (data: CreateCategoryForm) => {
    try {
      await createMutation.mutateAsync(data)
      setIsCreateOpen(false)
      reset()
    } catch (error) {
      console.error('Failed to create category', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Category', description: 'Are you sure you want to delete this category?', confirmLabel: 'Delete' })) {
      await deleteMutation.mutateAsync(id)
    }
  }

  const columns: DataTableColumn<CategoryRow>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (c) => <span className="font-medium text-gray-700">{c.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Categories</h2>
          <p className="text-gray-500">Manage product categories for classification.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Create a new category for products.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="e.g. Raw Materials"
                />
                {errors.name && <span className="text-sm text-red-500">{errors.name.message}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  {...register('code', { required: 'Code is required' })}
                  placeholder="e.g. RAW"
                />
                {errors.code && <span className="text-sm text-red-500">{errors.code.message}</span>}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <DataTable<CategoryRow>
            columns={columns}
            data={paged.data}
            meta={paged.meta}
            controller={controller}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            isError={isError}
            searchable
            searchPlaceholder="Search categories..."
            pageSizeOptions
            emptyMessage="No categories found."
            actions={(category) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuItem
                    onClick={() => handleDelete(category.id)}
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
