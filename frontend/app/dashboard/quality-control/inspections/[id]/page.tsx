'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Save, Shield, Plus, X, Edit } from 'lucide-react'

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
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

import { useInspection, useUpdateInspection, useDeleteInspection, InspectionStatus } from '@/hooks/useQualityControl'
import { format } from 'date-fns'

export default function InspectionDetailPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const inspectionId = params?.id as string
    const isEditMode = searchParams.get('edit') === 'true'

    const { data: inspection, isLoading } = useInspection(inspectionId)
    const updateMutation = useUpdateInspection()
    const deleteMutation = useDeleteInspection()

    const [isEditing, setIsEditing] = useState(isEditMode)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    const [formData, setFormData] = useState({
        inspectionType: 'VISUAL' as 'VISUAL' | 'DIMENSIONAL' | 'FUNCTIONAL' | 'LAB_TEST' | 'DOCUMENTATION',
        qualityStatus: 'PENDING' as InspectionStatus,
        results: '',
        notes: '',
        observations: [] as string[],
    })

    const [newObservation, setNewObservation] = useState('')

    useEffect(() => {
        if (inspection) {
            setFormData({
                inspectionType: inspection.inspectionType,
                qualityStatus: inspection.status,
                results: inspection.results || '',
                notes: inspection.notes || '',
                observations: inspection.observations || [],
            })
        }
    }, [inspection])

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

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({
                id: inspectionId,
                data: {
                    inspectionType: formData.inspectionType,
                    qualityStatus: formData.qualityStatus,
                    results: formData.results,
                    notes: formData.notes || undefined,
                    observations: formData.observations,
                },
            })
            setIsEditing(false)
            router.push('/dashboard/quality-control/inspections')
        } catch {
            // Error handled by hook
        }
    }

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(inspectionId)
            router.push('/dashboard/quality-control/inspections')
        } catch {
            // Error handled by hook
        }
    }

    const getStatusBadge = (status: InspectionStatus) => {
        const styles: Record<InspectionStatus, { className: string; label: string }> = {
            PENDING: { className: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Pending' },
            PASSED: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Passed' },
            FAILED: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Failed' },
            CONDITIONAL: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Conditional' },
            all: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'All' },
        }
        const style = styles[status]

        return (
            <Badge className={`${style.className}`}>
                {style.label}
            </Badge>
        )
    }

    if (isLoading) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-center h-64">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent"></div>
                </div>
            </div>
        )
    }

    if (!inspection) {
        return (
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="text-center py-12">
                    <p className="text-gray-500">Inspection not found</p>
                    <Button
                        variant="outline"
                        onClick={() => router.push('/dashboard/quality-control/inspections')}
                        className="mt-4"
                    >
                        Back to Inspections
                    </Button>
                </div>
            </div>
        )
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
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900">
                        {isEditing ? 'Edit Inspection' : 'Inspection Details'}
                    </h2>
                    <p className="text-gray-500">
                        {inspection.inspectionNumber}
                    </p>
                </div>
                {!isEditing && (
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600 hover:text-red-700"
                        >
                            Delete
                        </Button>
                    </div>
                )}
            </div>

            <div className="mx-auto max-w-4xl space-y-6">
                {/* Basic Information */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Shield className="h-5 w-5 text-green-600" />
                            Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-500">Product</Label>
                                <p className="font-medium">{inspection.productName || 'N/A'}</p>
                                {inspection.productCode && (
                                    <p className="text-sm text-gray-500">{inspection.productCode}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-gray-500">Batch</Label>
                                <p className="font-medium">{inspection.batchNumber || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">Inspection Type</Label>
                                {isEditing ? (
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
                                ) : (
                                    <p className="font-medium">{inspection.inspectionType}</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-gray-500">Status</Label>
                                {isEditing ? (
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
                                ) : (
                                    <div className="mt-1">{getStatusBadge(inspection.status)}</div>
                                )}
                            </div>
                            <div>
                                <Label className="text-gray-500">Inspector</Label>
                                <p className="font-medium">{inspection.inspectorName || 'N/A'}</p>
                            </div>
                            <div>
                                <Label className="text-gray-500">Date</Label>
                                <p className="font-medium">
                                    {inspection.inspectedDate
                                        ? format(new Date(inspection.inspectedDate), 'MMM dd, yyyy HH:mm')
                                        : format(new Date(inspection.createdAt), 'MMM dd, yyyy HH:mm')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Results */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <Textarea
                                value={formData.results}
                                onChange={(e) =>
                                    setFormData({ ...formData, results: e.target.value })
                                }
                                placeholder="Enter inspection results..."
                                rows={6}
                            />
                        ) : (
                            <p className="whitespace-pre-wrap text-gray-700">
                                {inspection.results || 'No results recorded'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Observations */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Observations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isEditing ? (
                            <>
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
                                    <div className="space-y-2">
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
                            </>
                        ) : (
                            <div className="space-y-2">
                                {inspection.observations && inspection.observations.length > 0 ? (
                                    inspection.observations.map((obs, index) => (
                                        <div
                                            key={index}
                                            className="p-2 bg-gray-50 rounded border border-gray-200 text-sm"
                                        >
                                            {obs}
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500">No observations recorded</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isEditing ? (
                            <Textarea
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({ ...formData, notes: e.target.value })
                                }
                                placeholder="Additional notes or comments..."
                                rows={4}
                            />
                        ) : (
                            <p className="whitespace-pre-wrap text-gray-700">
                                {inspection.notes || 'No notes'}
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Actions */}
                {isEditing && (
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsEditing(false)
                                if (inspection) {
                                    setFormData({
                                        inspectionType: inspection.inspectionType,
                                        qualityStatus: inspection.status,
                                        results: inspection.results || '',
                                        notes: inspection.notes || '',
                                        observations: inspection.observations || [],
                                    })
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {updateMutation.isPending ? (
                                'Saving...'
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Inspection</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this inspection? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

