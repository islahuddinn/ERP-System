'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useBroker, useUpdateBroker } from '@/hooks/useBrokers'
import { toast } from 'react-hot-toast'

const brokerSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    address: z.string().optional(),
    commissionRate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
        message: 'Commission rate must be between 0 and 100',
    }),
    salesTarget: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
})

export default function EditBrokerPage() {
    const params = useParams()
    const id = params?.id as string
    const router = useRouter()
    const { data: broker, isLoading } = useBroker(id)
    const updateBrokerMutation = useUpdateBroker()

    const form = useForm<z.infer<typeof brokerSchema>>({
        resolver: zodResolver(brokerSchema),
        defaultValues: {
            name: '',
            contactPerson: '',
            phone: '',
            email: '',
            address: '',
            commissionRate: '0',
            salesTarget: '0',
            status: 'ACTIVE',
        },
    })

    // Pre-fill form when data is loaded
    useEffect(() => {
        if (broker) {
            form.reset({
                name: broker.name || '',
                contactPerson: broker.contactPerson || '',
                phone: broker.phone || '',
                email: broker.email || '',
                address: broker.address || '',
                commissionRate: String(broker.commissionRate || '0'),
                salesTarget: String(broker.salesTarget || '0'),
                status: broker.status || 'ACTIVE',
            })
        }
    }, [broker, form])

    async function onSubmit(values: z.infer<typeof brokerSchema>) {
        try {
            await updateBrokerMutation.mutateAsync({
                id: id,
                data: {
                    ...values,
                    commissionRate: Number(values.commissionRate),
                    salesTarget: values.salesTarget ? Number(values.salesTarget) : 0,
                }
            })
            toast.success('Broker updated successfully')
            router.push('/dashboard/brokers')
        } catch (error: any) {
            console.error('Error updating broker:', error)
            const message = error?.response?.data?.message || 'Failed to update broker'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        )
    }

    return (
        <ProtectedRoute>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit Broker</h2>
                        <p className="text-gray-500">Update broker details and settings.</p>
                    </div>
                </div>

                <div className="grid gap-6 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Broker Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Broker Name <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Ali Khan" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contactPerson"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contact Person</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Contact person name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="+92..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="broker@example.com" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Full address..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="commissionRate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Commission Rate (%) <span className="text-red-500">*</span></FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" min="0" max="100" {...field} />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Default commission rate for all sales. Can be overridden per product.
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="salesTarget"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Monthly Sales Target</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="1" min="0" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                                                        <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="flex justify-end gap-4">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.back()}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                            disabled={updateBrokerMutation.isPending}
                                        >
                                            {updateBrokerMutation.isPending ? 'Saving...' : 'Save Changes'}
                                            {!updateBrokerMutation.isPending && <Save className="ml-2 h-4 w-4" />}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </ProtectedRoute>
    )
}
