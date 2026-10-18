'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Discount } from '@/hooks/pos/useCart';
import { formatCurrency } from '@/lib/currency';

interface OrderSummaryProps {
  subtotal: number;
  discount: Discount;
  onDiscountChange: (discount: Discount) => void;
  totalAmount: number;
  taxAmount: number;
  taxRate: number;
  onTaxRateChange: (taxRate: number) => void;
  onCompleteSale: () => void;
  isCompletingSale: boolean;
  cartItemsCount: number;
  darkMode?: boolean;
  showCompleteButton?: boolean;
}

export default function OrderSummary({
  subtotal,
  discount,
  onDiscountChange,
  totalAmount,
  taxAmount,
  taxRate,
  onTaxRateChange,
  onCompleteSale,
  isCompletingSale,
  cartItemsCount,
  darkMode = false,
  showCompleteButton = true
}: OrderSummaryProps) {
  // Local state for tax input - start empty like discount field
  const [localTaxRate, setLocalTaxRate] = useState<string>(taxRate > 0 ? taxRate.toString() : '');

  // Sync local state when prop changes (but not during user input)
  useEffect(() => {
    // If taxRate is 0, show empty string (like discount field)
    if (taxRate === 0) {
      setLocalTaxRate('');
    } else {
      // Only update if the displayed value is different from taxRate
      const currentValue = localTaxRate === '' ? 0 : parseFloat(localTaxRate);
      if (isNaN(currentValue) || currentValue !== taxRate) {
        setLocalTaxRate(taxRate.toString());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taxRate]);
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Subtotal:</span>
        <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(Number(subtotal || 0))}</span>
      </div>
      
      <div className="flex justify-between">
        <span className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Discount:</span>
        <div className="flex items-center space-x-2">
          <Input 
            type="number" 
            className={`w-16 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              darkMode ? "bg-gray-800/50 border-gray-600 text-white" : ""
            }`}
            value={discount.value || ''}
            onChange={(e) => {
              const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
              onDiscountChange({
                ...discount,
                value,
                amount: discount.type === 'PERCENTAGE' ? (subtotal * value / 100) : value
              });
            }}
            onKeyDown={(e) => {
              // Allow backspace, delete, arrow keys, and number keys
              if (e.key === 'Backspace' || e.key === 'Delete' || 
                  e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                  e.key === 'Tab' || e.key === 'Enter' ||
                  /[0-9.]/.test(e.key)) {
                return;
              }
              e.preventDefault();
            }}
          />
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input 
                type="radio" 
                name="discountType" 
                checked={discount.type === 'FIXED'}
                onChange={() => onDiscountChange({ ...discount, type: 'FIXED' })}
                className="mr-1"
              />
              <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>Rs.</span>
            </label>
            <label className="flex items-center">
              <input 
                type="radio" 
                name="discountType" 
                checked={discount.type === 'PERCENTAGE'}
                onChange={() => onDiscountChange({ ...discount, type: 'PERCENTAGE' })}
                className="mr-1"
              />
              <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>%</span>
            </label>
          </div>
        </div>
      </div>
      
      {discount.amount > 0 && (
        <div className={`flex justify-between ${darkMode ? "text-green-400" : "text-green-600"}`}>
          <span className="text-xs">Discount Amount:</span>
          <span className="text-xs">-{formatCurrency(Number(discount.amount || 0))}</span>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Tax:</span>
          <Input 
            type="number" 
            className={`w-12 text-right text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              darkMode ? "bg-gray-800/50 border-gray-600 text-white" : ""
            }`}
            placeholder="0"
            value={localTaxRate}
            onChange={(e) => {
              const inputValue = e.target.value;
              // Update local state immediately for responsive UI
              setLocalTaxRate(inputValue);
              
              // Parse and validate the value
              if (inputValue === '' || inputValue === '-') {
                // Allow empty - set tax rate to 0 (like discount field)
                onTaxRateChange(0);
                return;
              }
              
              const parsedValue = parseFloat(inputValue);
              // Only update parent state if it's a valid number and within range
              if (!isNaN(parsedValue) && parsedValue >= 0 && parsedValue <= 100) {
                onTaxRateChange(parsedValue);
              }
            }}
            onBlur={(e) => {
              // On blur, ensure we have a valid value
              const inputValue = e.target.value.trim();
              if (inputValue === '' || isNaN(parseFloat(inputValue)) || parseFloat(inputValue) < 0) {
                // Allow empty - set tax rate to 0 (like discount field)
                onTaxRateChange(0);
                setLocalTaxRate('');
              } else {
                // Ensure the value is within valid range
                const parsedValue = parseFloat(inputValue);
                const finalValue = parsedValue > 100 ? 100 : parsedValue;
                onTaxRateChange(finalValue);
                setLocalTaxRate(finalValue.toString());
              }
            }}
            onKeyDown={(e) => {
              // Allow backspace, delete, arrow keys, and number keys
              if (e.key === 'Backspace' || e.key === 'Delete' || 
                  e.key === 'ArrowLeft' || e.key === 'ArrowRight' ||
                  e.key === 'Tab' || e.key === 'Enter' ||
                  /[0-9.]/.test(e.key)) {
                return;
              }
              e.preventDefault();
            }}
            min="0"
            max="100"
            step="0.1"
          />
          <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>%</span>
        </div>
        <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>
          {formatCurrency(Number(taxAmount || 0))}
        </span>
      </div>
      
      <div className={`border-t pt-2 ${darkMode ? "border-gray-700" : "border-gray-300"}`}>
        <div className={`flex justify-between font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
          <span className="text-sm">Total Amount:</span>
          <span className="text-sm">{formatCurrency(Number(totalAmount || 0))}</span>
        </div>
      </div>
      
      <div>
        <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Note</label>
        <Input placeholder="Note" className={darkMode ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500" : ""} />
      </div>
      
      {showCompleteButton && (
        <div className="mt-6">
          <Button 
            onClick={onCompleteSale}
            disabled={cartItemsCount === 0 || isCompletingSale}
            className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-sky-500 hover:from-emerald-500 hover:to-sky-400 text-white py-2 text-sm font-semibold shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isCompletingSale ? 'Processing...' : 'Complete'}
          </Button>
        </div>
      )}
    </div>
  );
}
