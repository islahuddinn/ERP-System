'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/currency';
import { extractArrayFromResponse } from '@/lib/response-utils';

const expenseSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  locationId: z.string().min(1, 'Location is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  paymentDate: z.string().min(1, 'Payment date is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  description: z.string().optional(),
  vendor: z.string().optional(),
  referenceNumber: z.string().optional(),
  isRecurring: z.boolean().optional(),
  recurringFrequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

interface Location {
  id: string;
  name: string;
  type: string;
}

export default function AddExpensePage() {
  const router = useRouter();
  const createExpense = useCreateExpense();
  const { data: categories = [] } = useExpenseCategories();
  const [isRecurring, setIsRecurring] = useState(false);

  // Fetch locations
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get('/locations');
      return extractArrayFromResponse<Location>(response.data);
    },
    staleTime: 5 * 60 * 1000,
  });

  const form = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: format(new Date(), 'yyyy-MM-dd'),
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      isRecurring: false,
      amount: 0,
    },
  });

  const watchedAmount = form.watch('amount');

  const onSubmit = (data: ExpenseForm) => {
    const submitData = {
      ...data,
      isRecurring: isRecurring,
      recurringFrequency: isRecurring ? data.recurringFrequency : undefined,
    };

    createExpense.mutate(submitData, {
      onSuccess: () => {
        router.push('/dashboard/expenses');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">New Expense</h1>
          <p className="text-gray-400">Record a new business expense</p>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Expense Information */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Expense Information</CardTitle>
            <CardDescription className="text-gray-400">
              Basic information about the expense
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId" className="text-gray-300">
                  Category *
                </Label>
                <Select
                  value={form.watch('categoryId')}
                  onValueChange={(value) => form.setValue('categoryId', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          {category.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.categoryId && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.categoryId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId" className="text-gray-300">
                  Location *
                </Label>
                <Select
                  value={form.watch('locationId')}
                  onValueChange={(value) => form.setValue('locationId', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {(locationsData ?? []).map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.locationId && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.locationId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-gray-300">
                  Amount *
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...form.register('amount', { valueAsNumber: true })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="0.00"
                />
                {form.formState.errors.amount && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.amount.message}
                  </p>
                )}
                {watchedAmount > 0 && (
                  <p className="text-sm text-gray-400">
                    {formatCurrency(watchedAmount)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod" className="text-gray-300">
                  Payment Method *
                </Label>
                <Select
                  value={form.watch('paymentMethod')}
                  onValueChange={(value) => form.setValue('paymentMethod', value)}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="MOBILE_PAYMENT">Mobile Payment</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.paymentMethod && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.paymentMethod.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDate" className="text-gray-300">
                  Expense Date *
                </Label>
                <Input
                  id="expenseDate"
                  type="date"
                  {...form.register('expenseDate')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.expenseDate && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.expenseDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="text-gray-300">
                  Payment Date *
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  {...form.register('paymentDate')}
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {form.formState.errors.paymentDate && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.paymentDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor" className="text-gray-300">
                  Vendor/Supplier
                </Label>
                <Input
                  id="vendor"
                  {...form.register('vendor')}
                  placeholder="Vendor name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referenceNumber" className="text-gray-300">
                  Reference Number
                </Label>
                <Input
                  id="referenceNumber"
                  {...form.register('referenceNumber')}
                  placeholder="Invoice/Receipt number"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-300">
                Description
              </Label>
              <Textarea
                id="description"
                {...form.register('description')}
                placeholder="Additional notes about this expense..."
                className="bg-gray-700 border-gray-600 text-white"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recurring Expense */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Recurring Expense</CardTitle>
            <CardDescription className="text-gray-400">
              Set up recurring expenses (optional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isRecurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
              />
              <Label
                htmlFor="isRecurring"
                className="text-gray-300 font-normal cursor-pointer"
              >
                This is a recurring expense
              </Label>
            </div>

            {isRecurring && (
              <div className="space-y-2">
                <Label htmlFor="recurringFrequency" className="text-gray-300">
                  Recurring Frequency *
                </Label>
                <Select
                  value={form.watch('recurringFrequency')}
                  onValueChange={(value) =>
                    form.setValue('recurringFrequency', value as any)
                  }
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.recurringFrequency && (
                  <p className="text-red-400 text-sm">
                    {form.formState.errors.recurringFrequency.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(watchedAmount || 0)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createExpense.isPending}
                  className="bg-primary hover:bg-primary/90"
                >
                  {createExpense.isPending ? 'Creating...' : 'Create Expense'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

