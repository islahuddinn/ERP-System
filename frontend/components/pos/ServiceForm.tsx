'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ServiceFormData } from '@/types/pos';

interface ServiceFormProps {
  onAddService: (serviceData: ServiceFormData) => void;
}

export default function ServiceForm({ onAddService }: ServiceFormProps) {
  const [formData, setFormData] = useState<ServiceFormData>({
    name: '',
    stock: '',
    uom: undefined,
    quantity: 1,
    unitPrice: ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim() || !formData.unitPrice.trim()) {
      return;
    }
    
    const unitPrice = parseFloat(formData.unitPrice);
    if (isNaN(unitPrice)) {
      return;
    }
    
    onAddService({
      ...formData,
      unitPrice: unitPrice.toString()
    });
    
    // Reset form
    setFormData({
      name: '',
      stock: '',
      uom: undefined,
      quantity: 1,
      unitPrice: ''
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Product</label>
          <Input 
            placeholder="Product" 
            value={formData.name} 
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Stock</label>
          <Input 
            placeholder="Stock" 
            value={formData.stock} 
            onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))} 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">UOM</label>
          <Select value={formData.uom} onValueChange={(value) => setFormData(prev => ({ ...prev, uom: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Pieces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pcs">PCS</SelectItem>
              <SelectItem value="kg">KG</SelectItem>
              <SelectItem value="liter">Liter</SelectItem>
              <SelectItem value="pieces">Pieces</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Quantity</label>
          <Input 
            type="number" 
            value={formData.quantity} 
            onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Unit Price</label>
          <Input 
            placeholder="Unit Price" 
            value={formData.unitPrice} 
            onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))} 
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!formData.name.trim() || !formData.unitPrice.trim()}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Add
        </Button>
      </div>
    </div>
  );
}
