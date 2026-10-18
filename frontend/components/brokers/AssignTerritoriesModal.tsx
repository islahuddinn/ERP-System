'use client'

import { useState, useEffect } from 'react'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useAssignTerritories } from '@/hooks/useBrokers'
import { toast } from 'react-hot-toast'
import { X, Search, Check, Plus, MapPin } from 'lucide-react'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'

interface AssignTerritoriesModalProps {
    isOpen: boolean
    onClose: () => void
    broker: any
}

export function AssignTerritoriesModal({ isOpen, onClose, broker }: AssignTerritoriesModalProps) {
    const [territories, setTerritories] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch zones
    const { data: zones } = useQuery({
        queryKey: ['zones'],
        queryFn: async () => {
            const response = await apiClient.get('/locations/zones')
            return response.data || []
        },
        enabled: isOpen
    })

    const assignMutation = useAssignTerritories()

    // Initialize with existing territories
    useEffect(() => {
        if (isOpen && broker?.brokerTerritories) {
            setTerritories(broker.brokerTerritories.map((bt: any) => ({
                zoneId: bt.zoneId,
                areaName: bt.areaName,
                city: bt.city,
                region: bt.region
            })))
        }
    }, [isOpen, broker])

    const addTerritory = () => {
        setTerritories([...territories, {
            zoneId: broker.zoneId || '',
            areaName: '',
            city: '',
            region: ''
        }])
    }

    const removeTerritory = (index: number) => {
        setTerritories(territories.filter((_, i) => i !== index))
    }

    const updateTerritory = (index: number, field: string, value: string) => {
        const newTerritories = [...territories]
        newTerritories[index] = { ...newTerritories[index], [field]: value }
        setTerritories(newTerritories)
    }

    const handleSave = () => {
        // Validate
        if (territories.some(t => !t.areaName)) {
            toast.error('Area name is required for all territories')
            return
        }

        setIsSubmitting(true)
        assignMutation.mutate({
            id: broker.id,
            data: {
                territories: territories.map(t => ({
                    ...t,
                    zoneId: t.zoneId || undefined
                }))
            }
        }, {
            onSuccess: () => {
                toast.success('Territories updated')
                onClose()
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to update territories')
            },
            onSettled: () => setIsSubmitting(false)
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Territories for {broker?.name}</DialogTitle>
                    <DialogDescription>
                        Define the geographical areas where this broker operates.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1">
                    {territories.map((t, index) => (
                        <div key={index} className="p-4 border rounded-xl relative bg-gray-50/50">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2 h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                onClick={() => removeTerritory(index)}
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Area Name *</Label>
                                    <Input
                                        placeholder="e.g. Downtown"
                                        value={t.areaName}
                                        onChange={(e) => updateTerritory(index, 'areaName', e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Zone</Label>
                                    <Select
                                        value={t.zoneId}
                                        onValueChange={(val) => updateTerritory(index, 'zoneId', val)}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select Zone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {zones?.map((zone: any) => (
                                                <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">City</Label>
                                    <Input
                                        placeholder="e.g. New York"
                                        value={t.city}
                                        onChange={(e) => updateTerritory(index, 'city', e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase tracking-wider text-gray-500 font-bold">Region</Label>
                                    <Input
                                        placeholder="e.g. East"
                                        value={t.region}
                                        onChange={(e) => updateTerritory(index, 'region', e.target.value)}
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {territories.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed rounded-xl border-gray-200">
                            <MapPin className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                            <p className="text-gray-500">No territories assigned yet.</p>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        onClick={addTerritory}
                        className="w-full border-dashed border-2 h-12 hover:border-green-500 hover:text-green-600 transition-all"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Territory
                    </Button>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
