'use client'

import { useState, useEffect } from 'react'
import {
    Dialog, DialogContent, DialogDescription,
    DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAssignProducts } from '@/hooks/useBrokers'
import { toast } from 'react-hot-toast'
import { X, Plus, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface AssignProductsModalProps {
    isOpen: boolean
    onClose: () => void
    broker: any
}

interface ManualProduct {
    id: string
    productName: string
    price: number
    quantity: number
    commissionRate: number
    isManual?: boolean
}

export function AssignProductsModal({ isOpen, onClose, broker }: AssignProductsModalProps) {
    const [manualProducts, setManualProducts] = useState<ManualProduct[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state for new product
    const [newProduct, setNewProduct] = useState({
        productName: '',
        price: '',
        quantity: '',
        commissionRate: broker?.commissionRate || 0
    })

    // Initialize with existing products
    useEffect(() => {
        if (isOpen && broker?.brokerProducts) {
            setManualProducts(broker.brokerProducts.map((bp: any) => ({
                id: bp.id || bp.productId || `manual-${Math.random()}`,
                productName: bp.product?.name || bp.productName || 'Unknown Product',
                price: Number(bp.price || 0),
                quantity: Number(bp.quantity || 0),
                commissionRate: Number(bp.commissionRate || broker.commissionRate || 0),
                isManual: !bp.productId // Track if it originated as manual
            })))
        }
    }, [isOpen, broker])

    const addManualProduct = () => {
        if (!newProduct.productName.trim()) {
            toast.error('Product name is required')
            return
        }

        const product: ManualProduct & { isManual: boolean } = {
            id: `manual-${Date.now()}`,
            productName: newProduct.productName,
            price: Number(newProduct.price) || 0,
            quantity: Number(newProduct.quantity) || 0,
            commissionRate: Number(newProduct.commissionRate) || Number(broker?.commissionRate) || 0,
            isManual: true
        }

        setManualProducts([...manualProducts, product])

        // Reset form
        setNewProduct({
            productName: '',
            price: '',
            quantity: '',
            commissionRate: broker?.commissionRate || 0
        })

        toast.success('Product added to list')
    }

    const removeProduct = (id: string) => {
        setManualProducts(manualProducts.filter(p => p.id !== id))
    }

    const updateProduct = (id: string, field: keyof ManualProduct, value: any) => {
        setManualProducts(manualProducts.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ))
    }

    const assignMutation = useAssignProducts()

    const handleSave = () => {
        if (manualProducts.length === 0) {
            toast.error('Please add at least one product')
            return
        }

        setIsSubmitting(true)

        assignMutation.mutate({
            id: broker.id,
            data: {
                products: manualProducts.map(p => {
                    // Base product object with required fields
                    const baseProduct = {
                        productName: p.productName,
                        price: p.price,
                        quantity: p.quantity,
                        commissionRate: p.commissionRate,
                    }

                    // Only include productId if it's from inventory
                    return p.isManual
                        ? baseProduct
                        : { ...baseProduct, productId: p.id }
                })
            }
        }, {
            onSuccess: () => {
                toast.success('Product assignments updated successfully')
                onClose()
            },
            onError: (error: any) => {
                toast.error(error?.response?.data?.message || 'Failed to update assignments')
            },
            onSettled: () => setIsSubmitting(false)
        })
    }

    const totalValue = manualProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    const totalCommission = manualProducts.reduce((sum, p) =>
        sum + ((p.price * p.quantity) * (p.commissionRate / 100)), 0
    )

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-green-600" />
                        Manage Products for {broker?.name}
                    </DialogTitle>
                    <DialogDescription>
                        Add products manually for commission tracking. These are for broker performance only and do not affect inventory.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 flex-1 overflow-hidden">
                    {/* Add New Product Form */}
                    <Card className="border-green-200 bg-green-50/30">
                        <CardContent className="pt-4">
                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Product
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                <div className="md:col-span-2">
                                    <Label className="text-xs">Product Name *</Label>
                                    <Input
                                        placeholder="e.g. Premium Widget"
                                        value={newProduct.productName}
                                        onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })}
                                        onKeyPress={(e) => e.key === 'Enter' && addManualProduct()}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Price (PKR)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={newProduct.price}
                                        onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Quantity</Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={newProduct.quantity}
                                        onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
                                        className="h-9"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Commission %</Label>
                                    <div className="flex gap-1">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            placeholder="0"
                                            value={newProduct.commissionRate}
                                            onChange={(e) => setNewProduct({ ...newProduct, commissionRate: Number(e.target.value) })}
                                            className="h-9 flex-1"
                                        />
                                        <Button
                                            type="button"
                                            onClick={addManualProduct}
                                            size="sm"
                                            className="h-9 bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Products List */}
                    <div className="flex flex-col border rounded-lg overflow-hidden flex-1">
                        <div className="bg-gray-50 p-3 text-sm font-medium border-b flex justify-between items-center">
                            <span>Assigned Products</span>
                            <div className="flex gap-4 text-xs text-gray-600">
                                <span>Total Value: <strong className="text-green-600">PKR {totalValue.toLocaleString()}</strong></span>
                                <span>Est. Commission: <strong className="text-green-600">PKR {totalCommission.toFixed(2)}</strong></span>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 p-3">
                            {manualProducts.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No products added yet</p>
                                    <p className="text-xs mt-1">Use the form above to add products manually</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {manualProducts.map((product, index) => (
                                        <div
                                            key={product.id}
                                            className="border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow"
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                                                <div className="md:col-span-2">
                                                    <Label className="text-xs text-gray-500">Product Name</Label>
                                                    <Input
                                                        value={product.productName}
                                                        onChange={(e) => updateProduct(product.id, 'productName', e.target.value)}
                                                        className="h-8 font-medium"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Price (PKR)</Label>
                                                    <Input
                                                        type="number"
                                                        value={product.price}
                                                        onChange={(e) => updateProduct(product.id, 'price', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Quantity</Label>
                                                    <Input
                                                        type="number"
                                                        value={product.quantity}
                                                        onChange={(e) => updateProduct(product.id, 'quantity', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-xs text-gray-500">Commission %</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        value={product.commissionRate}
                                                        onChange={(e) => updateProduct(product.id, 'commissionRate', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="flex items-end justify-between">
                                                    <div>
                                                        <Label className="text-xs text-gray-500">Total</Label>
                                                        <div className="text-sm font-semibold text-green-600">
                                                            PKR {(product.price * product.quantity).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                                                        onClick={() => removeProduct(product.id)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="mt-4 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {manualProducts.length} product{manualProducts.length !== 1 ? 's' : ''} assigned
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={handleSave}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={isSubmitting || manualProducts.length === 0}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Assignments'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
