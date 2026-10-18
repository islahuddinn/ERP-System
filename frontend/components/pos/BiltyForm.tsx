'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BiltyFormData } from '@/types/pos';

interface BiltyFormProps {
  onDataChange: (data: BiltyFormData) => void;
}

export default function BiltyForm({ onDataChange }: BiltyFormProps) {
  const [formData, setFormData] = useState<BiltyFormData>({
    address: '',
    contact: '',
    labour: undefined,
    freightCharges: 0,
    labourExpense: 0
  });

  const handleChange = (field: keyof BiltyFormData, value: any) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onDataChange(newData);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Builty Address</label>
          <Input 
            placeholder="Builty Address" 
            value={formData.address} 
            onChange={(e) => handleChange('address', e.target.value)} 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Builty Contact#</label>
          <Input 
            placeholder="Builty Contact#" 
            value={formData.contact} 
            onChange={(e) => handleChange('contact', e.target.value)} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Labour</label>
          <Select value={formData.labour} onValueChange={(value) => handleChange('labour', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Please select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="labour1">Labour 1</SelectItem>
              <SelectItem value="labour2">Labour 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Freight Charges</label>
          <Input 
            type="number" 
            value={formData.freightCharges} 
            onChange={(e) => handleChange('freightCharges', parseFloat(e.target.value) || 0)} 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-900 mb-1">Labour Expense</label>
          <Input 
            type="number" 
            value={formData.labourExpense} 
            onChange={(e) => handleChange('labourExpense', parseFloat(e.target.value) || 0)} 
          />
        </div>
      </div>
    </div>
  );
}
