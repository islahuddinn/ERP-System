'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Shield, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

import { useCreateInspection } from '@/hooks/useQualityControl'
import { useProducts } from '@/hooks/useProducts'

export default function CreateInspectionPage() {
    const router = useRouter()

    const { data: productsResponse } = useProducts({ isActive: true })
    const products = useMemo(() => {
        const data = (productsResponse as any)?.data || productsResponse
        return Array.isArray(data) ? data : []
    }, [productsResponse])

    const createInspection = useCreateInspection()

    const [formData, setFormData] = useState({
        productId: '',
        inspectionType: 'VISUAL' as 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION',
        qualityStatus: 'PENDING' as 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL',
        results: '',
        notes: '',
        observations: [] as string[],
        batchId: '',
    })

    const [newObservation, setNewObservation] = useState('')

    const handleAddObservation = () => {
        if (newObservation.trim()) {
            setFormData({
                ...formData,
                observations: [...formData.observations, newObservation.trim()],
            })
            setNewObservation('')
        }
    }

    const handleRemoveObservation = (index: number) => {
        setFormData({
            ...formData,
            observations: formData.observations.filter((_, i) => i !== index),
        })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.productId) {
            alert('Please select a product')
            return
        }
        try {
            await createInspection.mutateAsync({
                productId: formData.productId,
                inspectionType: formData.inspectionType,
                qualityStatus: formData.qualityStatus,
                results: formData.results || 'Initial inspection',
                notes: formData.notes || undefined,
                observations: formData.observations,
                batchId: formData.batchId || undefined,
            })
            router.push('/dashboard/quality-control/inspections')
        } catch {
            // handled by hook toast
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
                    <h2 className="text-3xl font-bold text-gray-900">
                        Create Inspection
                    </h2>
                    <p className="text-gray-500">
                        Initiate a new quality control record.
                    </p>
                </div>
            </div>

            <div className="mx-auto max-w-2xl">
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Shield className="h-5 w-5 text-green-600" />
                            Inspection Details
                        </CardTitle>
                        <CardDescription>
                            Fill in the basic information to start the inspection process.
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product */}
                                <div className="space-y-2">
                                    <Label htmlFor="productId">Product *</Label>
                                    <Select
                                        value={formData.productId}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, productId: value })
                                        }
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {products.map((product: any) => (
                                                <SelectItem key={product.id} value={product.id}>
                                                    {product.name} ({product.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Inspection Type */}
                                <div className="space-y-2">
                                    <Label htmlFor="inspectionType">Inspection Type *</Label>
                                    <Select
                                        value={formData.inspectionType}
                                        onValueChange={(value: any) =>
                                            setFormData({ ...formData, inspectionType: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VISUAL">Visual</SelectItem>
                                            <SelectItem value="DIMENSIONAL">Dimensional</SelectItem>
                                            <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                                            <SelectItem value="LAB_TEST">Lab Test</SelectItem>
                                            <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Quality Status */}
                                <div className="space-y-2">
                                    <Label htmlFor="qualityStatus">Quality Status *</Label>
                                    <Select
                                        value={formData.qualityStatus}
                                        onValueChange={(value: any) =>
                                            setFormData({ ...formData, qualityStatus: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="PENDING">Pending</SelectItem>
                                            <SelectItem value="PASSED">Passed</SelectItem>
                                            <SelectItem value="FAILED">Failed</SelectItem>
                                            <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Batch ID (Optional) */}
                                <div className="space-y-2">
                                    <Label htmlFor="batchId">Batch ID (Optional)</Label>
                                    <Input
                                        id="batchId"
                                        placeholder="Enter batch ID if applicable"
                                        value={formData.batchId}
                                        onChange={(e) =>
                                            setFormData({ ...formData, batchId: e.target.value })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Results */}
                            <div className="space-y-2">
                                <Label htmlFor="results">Results *</Label>
                                <Textarea
                                    id="results"
                                    required
                                    placeholder="Enter inspection results..."
                                    value={formData.results}
                                    onChange={(e) =>
                                        setFormData({ ...formData, results: e.target.value })
                                    }
                                    rows={4}
                                />
                            </div>

                            {/* Observations */}
                            <div className="space-y-2">
                                <Label>Observations *</Label>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Add an observation..."
                                            value={newObservation}
                                            onChange={(e) => setNewObservation(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleAddObservation()
                                                }
                                            }}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleAddObservation}
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {formData.observations.length > 0 && (
                                        <div className="space-y-1">
                                            {formData.observations.map((obs, index) => (
                                                <div
                                                    key={index}
                                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
                                                >
                                                    <span className="flex-1 text-sm">{obs}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveObservation(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notes: e.target.value })
                                    }
                                    placeholder="Additional notes or comments..."
                                    rows={3}
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => router.back()}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createInspection.isPending}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                    {createInspection.isPending ? (
                                        'Initiating...'
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
                                            Initiate Inspection
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
