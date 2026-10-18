'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateWaste, WasteType, CreateWasteDto } from '@/hooks/useWasteManagement'
import { useSitesDropdown } from '@/hooks/useSites'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useProducts } from '@/hooks/useProducts'

interface FormData {
    wasteType: WasteType
    itemType: 'RAW_MATERIAL' | 'PRODUCT'
    rawMaterialId: string
    productId: string
    quantity: string
    cost: string
    reason: string
    remarks: string
    siteId: string
}

export default function CreateWastePage() {
    const router = useRouter()
    const createMutation = useCreateWaste()

    // Radix <SelectItem> throws (blank screen "Something went wrong") on an empty-string
    // value, so drop any row without a valid id before it reaches a dropdown (#9).
    const { data: sitesData } = useSitesDropdown()
    const sites = (Array.isArray(sitesData) ? sitesData : []).filter((x: any) => x?.id)

    const { data: rawMaterialsData } = useRawMaterialsDropdown()
    const rawMaterials = (Array.isArray(rawMaterialsData) ? rawMaterialsData : (rawMaterialsData as any)?.data ?? []).filter((x: any) => x?.id)

    const { data: productsResponse } = useProducts({ isActive: true })
    const products = ((productsResponse as any)?.data ?? (Array.isArray(productsResponse) ? productsResponse : [])).filter((x: any) => x?.id)

    const { control, handleSubmit, watch, register, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            wasteType: 'PRODUCTION',
            itemType: 'RAW_MATERIAL',
            rawMaterialId: '',
            productId: '',
            quantity: '',
            cost: '',
            reason: '',
            remarks: '',
            siteId: 'no-site',
        },
    })

    const itemType = watch('itemType')

    const onSubmit = async (values: FormData) => {
        const dto: CreateWasteDto = {
            wasteType: values.wasteType,
            itemType: values.itemType,
            quantity: parseFloat(values.quantity),
            reason: values.reason,
        }

        if (values.itemType === 'RAW_MATERIAL' && values.rawMaterialId) {
            dto.rawMaterialId = values.rawMaterialId
        } else if (values.itemType === 'PRODUCT' && values.productId) {
            dto.productId = values.productId
        }

        if (values.cost) dto.cost = parseFloat(values.cost)
        if (values.remarks) dto.remarks = values.remarks
        if (values.siteId && values.siteId !== 'no-site') dto.siteId = values.siteId

        try {
            await createMutation.mutateAsync(dto)
            router.push('/dashboard/waste-management')
        } catch {
            // Error handled by hook toast
        }
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="text-gray-500 hover:text-green-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Record Waste</h2>
                    <p className="text-gray-500">Log a new waste or loss event.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-6">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Waste Details
                        </CardTitle>
                        <CardDescription>
                            Select what was wasted and why.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {/* Item Type */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">Item Type *</Label>
                            <Controller
                                name="itemType"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Select Item Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RAW_MATERIAL">Raw Material</SelectItem>
                                            <SelectItem value="PRODUCT">Product</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* Conditional item selector */}
                        {itemType === 'RAW_MATERIAL' ? (
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Raw Material *</Label>
                                <Controller
                                    name="rawMaterialId"
                                    control={control}
                                    rules={{ required: itemType === 'RAW_MATERIAL' }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="bg-gray-50 border-gray-200">
                                                <SelectValue placeholder="Select raw material" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {rawMaterials.map((rm: any) => (
                                                    <SelectItem key={rm.id} value={rm.id}>
                                                        {rm.name} ({rm.code})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.rawMaterialId && (
                                    <p className="text-sm text-red-600">Raw material is required</p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Product *</Label>
                                <Controller
                                    name="productId"
                                    control={control}
                                    rules={{ required: itemType === 'PRODUCT' }}
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger className="bg-gray-50 border-gray-200">
                                                <SelectValue placeholder="Select product" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {products.map((p: any) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name} ({p.code || p.sku || 'No Code'})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.productId && (
                                    <p className="text-sm text-red-600">Product is required</p>
                                )}
                            </div>
                        )}

                        {/* Waste Type */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">Waste Type *</Label>
                            <Controller
                                name="wasteType"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Select Waste Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PRODUCTION">Production</SelectItem>
                                            <SelectItem value="QUALITY_REJECT">Quality Reject</SelectItem>
                                            <SelectItem value="EXPIRY">Expiry</SelectItem>
                                            <SelectItem value="DAMAGE">Damage</SelectItem>
                                            <SelectItem value="SPOILAGE">Spoilage</SelectItem>
                                            <SelectItem value="OTHER">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {/* Quantity & Cost */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">Quantity *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder="0.00"
                                    className="bg-gray-50 border-gray-200"
                                    {...register('quantity', { required: true, min: 0.01 })}
                                />
                                {errors.quantity && (
                                    <p className="text-sm text-red-600">Valid quantity required (min 0.01)</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-medium">
                                    Cost (Optional)
                                    <span className="ml-1 text-xs text-gray-400">— auto-calculated if blank</span>
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="bg-gray-50 border-gray-200"
                                    {...register('cost')}
                                />
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">Reason *</Label>
                            <Textarea
                                placeholder="Explain why this waste occurred..."
                                className="bg-gray-50 border-gray-200 min-h-[80px]"
                                {...register('reason', { required: true })}
                            />
                            {errors.reason && (
                                <p className="text-sm text-red-600">Reason is required</p>
                            )}
                        </div>

                        {/* Remarks */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">Remarks (Optional)</Label>
                            <Textarea
                                placeholder="Additional notes..."
                                className="bg-gray-50 border-gray-200 min-h-[60px]"
                                {...register('remarks')}
                            />
                        </div>

                        {/* Site */}
                        <div className="space-y-2">
                            <Label className="text-gray-700 font-medium">Site (Optional)</Label>
                            <Controller
                                name="siteId"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200">
                                            <SelectValue placeholder="Select site where waste occurred" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="no-site">No site</SelectItem>
                                            {sites.map((site: any) => (
                                                <SelectItem key={site.id} value={site.id}>
                                                    {site.name} ({site.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        className="border-gray-200"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={createMutation.isPending}
                    >
                        {createMutation.isPending ? 'Saving...' : (
                            <>
                                <Save className="mr-2 h-4 w-4" /> Record Waste
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
