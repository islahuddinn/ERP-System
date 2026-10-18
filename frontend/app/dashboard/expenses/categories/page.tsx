'use client';

import { useState, useMemo } from 'react';
import { useConfirm } from '@/components/ui/confirm-provider';
import { Plus, Search, Edit, Trash2, Tag, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useExpenseCategories,
  useCreateExpenseCategory,
  useUpdateExpenseCategory,
  useDeleteExpenseCategory,
  type ExpenseCategory,
} from '@/hooks/useExpenseCategories';
import { useForm } from 'react-hook-form';

interface CategoryFormData {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive?: boolean;
}

const colorPresets = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#64748B', // Slate
];

export default function ExpenseCategoriesPage() {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);

  const { data: categories, isLoading, refetch } = useExpenseCategories(true);
  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();
  const deleteCategory = useDeleteExpenseCategory();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      description: '',
      icon: '',
      color: '#3B82F6',
      isActive: true,
    },
  });

  const selectedColor = watch('color');

  const filteredCategories = useMemo(() => {
    const list = Array.isArray(categories) ? categories : [];
    if (!search.trim()) {
      return list;
    }
    const query = search.toLowerCase();
    return list.filter((category) =>
      category.name.toLowerCase().includes(query) ||
      category.description?.toLowerCase().includes(query)
    );
  }, [categories, search]);

  const handleCreate = (data: CategoryFormData) => {
    createCategory.mutate(data, {
      onSuccess: () => {
        setIsCreateOpen(false);
        reset();
      },
    });
  };

  const handleEdit = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setValue('name', category.name);
    setValue('description', category.description || '');
    setValue('icon', category.icon || '');
    setValue('color', category.color || '#3B82F6');
    setValue('isActive', category.isActive);
    setIsEditOpen(true);
  };

  const handleUpdate = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data },
        {
          onSuccess: () => {
            setIsEditOpen(false);
            setEditingCategory(null);
            reset();
          },
        }
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Category', description: 'Are you sure you want to delete this category? This action cannot be undone.', confirmLabel: 'Delete' })) {
      deleteCategory.mutate(id, {
        onSuccess: () => {
          setDeleteCategoryId(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Expense Categories</h1>
          <p className="text-gray-400">Manage expense categories and organization</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-white">Create Category</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Add a new expense category
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 overflow-y-auto pr-4">
                <form onSubmit={handleSubmit(handleCreate)} id="create-category-form" className="space-y-4 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-300">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      {...register('name', { required: 'Name is required' })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Category name"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Category description"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="icon" className="text-gray-300">
                      Icon
                    </Label>
                    <Input
                      id="icon"
                      {...register('icon')}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Icon identifier (e.g., rent, salary)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Color</Label>
                    <div className="flex gap-2 flex-wrap pl-1">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setValue('color', color)}
                          className={`w-10 h-10 rounded-full border-2 ${
                            selectedColor === color
                              ? 'border-white scale-110'
                              : 'border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Input
                      type="text"
                      {...register('color')}
                      className="bg-gray-700 border-gray-600 text-white mt-2"
                      placeholder="#3B82F6"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isActive"
                      checked={watch('isActive') ?? true}
                      onCheckedChange={(checked) => setValue('isActive', checked === true)}
                    />
                    <Label htmlFor="isActive" className="text-gray-300 font-normal cursor-pointer">
                      Active
                    </Label>
                  </div>
                </form>
              </ScrollArea>
              <DialogFooter className="flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                    reset();
                  }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  form="create-category-form"
                  disabled={createCategory.isPending}
                >
                  {createCategory.isPending ? 'Creating...' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-700 border-gray-600 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Categories</CardTitle>
          <CardDescription className="text-gray-400">
            {filteredCategories.length} category{filteredCategories.length !== 1 ? 'ies' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">Name</TableHead>
                  <TableHead className="text-gray-300">Description</TableHead>
                  <TableHead className="text-gray-300">Icon</TableHead>
                  <TableHead className="text-gray-300">Color</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Expenses</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id} className="border-gray-700 hover:bg-gray-700/50">
                      <TableCell className="text-white font-medium">
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          {category.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {category.icon || '-'}
                      </TableCell>
                      <TableCell>
                        {category.color && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-full border border-gray-600"
                              style={{ backgroundColor: category.color }}
                            />
                            <span className="text-gray-300 text-sm">{category.color}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            category.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                          }
                        >
                          {category.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {category._count?.expenses || 0}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(category)}
                            className="text-indigo-400 hover:text-indigo-300"
                            title="Edit category"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteCategoryId(category.id);
                              handleDelete(category.id);
                            }}
                            className="text-red-400 hover:text-red-300"
                            title="Delete category"
                            disabled={deleteCategory.isPending || (category._count?.expenses || 0) > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400 py-8">
                      No categories found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-white">Edit Category</DialogTitle>
            <DialogDescription className="text-gray-400">
              Update category details
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <form onSubmit={handleSubmit(handleUpdate)} id="edit-category-form" className="space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-gray-300">
                Name *
              </Label>
              <Input
                id="edit-name"
                {...register('name', { required: 'Name is required' })}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Category name"
              />
              {errors.name && (
                <p className="text-red-400 text-sm">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="edit-description"
                {...register('description')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Category description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-icon" className="text-gray-300">
                Icon
              </Label>
              <Input
                id="edit-icon"
                {...register('icon')}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Icon identifier"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Color</Label>
              <div className="flex gap-2 flex-wrap pl-1">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setValue('color', color)}
                    className={`w-10 h-10 rounded-full border-2 ${
                      selectedColor === color
                        ? 'border-white scale-110'
                        : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <Input
                type="text"
                {...register('color')}
                className="bg-gray-700 border-gray-600 text-white mt-2"
                placeholder="#3B82F6"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-isActive"
                checked={watch('isActive') ?? true}
                onCheckedChange={(checked) => setValue('isActive', checked === true)}
              />
              <Label htmlFor="edit-isActive" className="text-gray-300 font-normal cursor-pointer">
                Active
              </Label>
            </div>
            </form>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setEditingCategory(null);
                reset();
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="edit-category-form"
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending ? 'Updating...' : 'Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

