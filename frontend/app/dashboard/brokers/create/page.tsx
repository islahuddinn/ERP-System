'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Label } from '@/components/ui/label'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateBroker } from '@/hooks/useBrokers'
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
    areaId: z.string().optional(), // Mapping "Zone" input to areaId
})

export default function CreateBrokerPage() {
    const router = useRouter()
    const createBrokerMutation = useCreateBroker()

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
            areaId: '',
        },
    })

    async function onSubmit(values: z.infer<typeof brokerSchema>) {
        try {
            await createBrokerMutation.mutateAsync({
                name: values.name,
                contactPerson: values.contactPerson || undefined,
                phone: values.phone || undefined,
                email: values.email || undefined,
                address: values.address || undefined,
                commissionRate: Number(values.commissionRate),
                salesTarget: values.salesTarget ? Number(values.salesTarget) : 0,
                status: values.status,
                areaId: values.areaId || undefined,
            })
            toast.success('Broker created successfully')
            router.push('/dashboard/brokers')
        } catch (error: any) {
            console.error('Error creating broker:', error)
            const message = error?.response?.data?.message || 'Failed to create broker'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
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
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Create Broker</h2>
                        <p className="text-gray-500">Add a new broker/sales agent to the system.</p>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                                    <FormField
                                        control={form.control}
                                        name="areaId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Zone <span className="text-gray-400 text-xs font-normal">(Sales Territory)</span></FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. North Zone, Lahore" {...field} />
                                                </FormControl>
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
                                            disabled={createBrokerMutation.isPending}
                                        >
                                            {createBrokerMutation.isPending ? 'Creating...' : 'Create Broker'}
                                            {!createBrokerMutation.isPending && <Save className="ml-2 h-4 w-4" />}
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
