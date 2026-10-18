'use client';

import { useState } from 'react';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CartItem } from '@/hooks/pos/useCart';
import { formatCurrency } from '@/lib/currency';

interface CartItemsProps {
  cartItems: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  editingQuantities: {[key: string]: string};
  onQuantityEdit: (itemId: string, value: string) => void;
  onQuantityEditFocus: (itemId: string, value: string) => void;
  onQuantityEditBlur: (itemId: string, value: string) => void;
  onQuantityEditKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => void;
  getProductStockQuantity?: (product: any) => number;
  products?: any[];
  onUpdateUnitPrice?: (itemId: string, unitPrice: number) => void;
  onUpdateItemDiscount?: (itemId: string, discountAmount: number) => void;
  darkMode?: boolean;
}

export default function CartItems({
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  editingQuantities,
  onQuantityEdit,
  onQuantityEditFocus,
  onQuantityEditBlur,
  onQuantityEditKeyDown,
  getProductStockQuantity,
  products,
  onUpdateUnitPrice,
  onUpdateItemDiscount,
  darkMode = false
}: CartItemsProps) {
  // State for editing unit prices and discounts
  const [editingUnitPrices, setEditingUnitPrices] = useState<{[key: string]: string}>({});
  const [editingDiscounts, setEditingDiscounts] = useState<{[key: string]: string}>({});
  return (
    <div className="h-80 overflow-y-auto overflow-x-hidden">
      <table className="w-full border-collapse table-fixed">
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[10%]" />
          <col className="w-[12%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
        </colgroup>
        <thead>
          <tr className={darkMode ? "border-b-2 border-gray-700 bg-gray-800/50" : "border-b-2 border-gray-300 bg-gray-50"}>
            <th className={`text-left py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Item Name</th>
            <th className={`text-center py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>QTY</th>
            <th className={`text-right py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Discount</th>
            <th className={`text-right py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Unit Price</th>
            <th className={`text-right py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Subtotal</th>
            <th className={`text-right py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Tax</th>
            <th className={`text-right py-1.5 px-1.5 text-xs font-semibold border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>Total</th>
            <th className={`text-center py-1.5 px-1.5 text-xs font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Action</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item) => {
            // Get stock information for products
            let availableStock = null;
            let isAtStockLimit = false;
            
            if (item.itemType === 'PRODUCT' && item.productId && getProductStockQuantity && products) {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                availableStock = getProductStockQuantity(product);
                isAtStockLimit = item.quantity >= availableStock;
              }
            }
            
            return (
            <tr key={item.id} className={darkMode ? "border-b border-gray-700 hover:bg-gray-800/30" : "border-b border-gray-200 hover:bg-gray-50"}>
              <td className={`py-1.5 px-1.5 text-xs border-r font-medium truncate ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>
                <div className="truncate" title={item.itemName}>{item.itemName}</div>
                {availableStock !== null && (
                  <div className={`text-[10px] mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Stock: {availableStock}
                  </div>
                )}
              </td>
              <td className={`py-1.5 px-1.5 text-center border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                <div className="flex items-center justify-center space-x-0.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                    className={darkMode ? "h-4 w-4 p-0 border-gray-600 hover:bg-gray-700 text-white" : "h-4 w-4 p-0 border-gray-300 hover:bg-gray-100"}
                  >
                    <Minus className="h-2 w-2" />
                  </Button>
                  <Input
                    type="number"
                    value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : item.quantity.toString()}
                    onChange={(e) => onQuantityEdit(item.id, e.target.value)}
                    onFocus={() => onQuantityEditFocus(item.id, item.quantity.toString())}
                    onBlur={() => onQuantityEditBlur(item.id, editingQuantities[item.id] || item.quantity.toString())}
                    onKeyDown={(e) => onQuantityEditKeyDown(e, item.id)}
                    className={`w-10 h-5 text-center text-[10px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      darkMode 
                        ? "border-gray-600 bg-gray-800/50 text-white" 
                        : "border-gray-300"
                    }`}
                    min="1"
                    max={availableStock || undefined}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    disabled={isAtStockLimit}
                    className={`h-4 w-4 p-0 ${
                      darkMode 
                        ? "border-gray-600 hover:bg-gray-700 text-white" 
                        : "border-gray-300 hover:bg-gray-100"
                    } ${
                      isAtStockLimit 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <Plus className="h-2 w-2" />
                  </Button>
                </div>
              </td>
              <td className={`py-1.5 px-1.5 text-right border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                {onUpdateItemDiscount ? (
                  <div className="flex flex-col items-end space-y-0.5">
                    <span className={`text-[10px] uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Rs.</span>
                    <Input
                      type="number"
                      value={editingDiscounts[item.id] !== undefined ? editingDiscounts[item.id] : (item.itemDiscountAmount || 0).toFixed(2)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingDiscounts(prev => ({ ...prev, [item.id]: value }));
                      }}
                      onFocus={() => {
                        setEditingDiscounts(prev => ({ ...prev, [item.id]: (item.itemDiscountAmount || 0).toFixed(2) }));
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && onUpdateItemDiscount) {
                          onUpdateItemDiscount(item.id, value);
                        } else if (isNaN(value) || value < 0) {
                          // Reset to 0 if invalid
                          onUpdateItemDiscount(item.id, 0);
                        }
                        setEditingDiscounts(prev => {
                          const newState = { ...prev };
                          delete newState[item.id];
                          return newState;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className={`w-12 h-5 text-right text-[10px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        darkMode 
                          ? "border-gray-600 bg-gray-800/50 text-white" 
                          : "border-gray-300"
                      }`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(item.itemDiscountAmount || 0)}</span>
                )}
              </td>
              <td className={`py-1.5 px-1.5 text-right border-r ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
                {onUpdateUnitPrice ? (
                  <div className="flex flex-col items-end space-y-0.5">
                    <span className={`text-[10px] uppercase tracking-wide ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Rs.</span>
                    <Input
                      type="number"
                      value={editingUnitPrices[item.id] !== undefined ? editingUnitPrices[item.id] : Number(item.unitPrice || 0).toFixed(2)}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditingUnitPrices(prev => ({ ...prev, [item.id]: value }));
                      }}
                      onFocus={() => {
                        setEditingUnitPrices(prev => ({ ...prev, [item.id]: Number(item.unitPrice || 0).toFixed(2) }));
                      }}
                      onBlur={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value >= 0 && onUpdateUnitPrice) {
                          onUpdateUnitPrice(item.id, value);
                        } else if (isNaN(value) || value < 0) {
                          // Reset to original price if invalid
                          onUpdateUnitPrice(item.id, item.unitPrice || 0);
                        }
                        setEditingUnitPrices(prev => {
                          const newState = { ...prev };
                          delete newState[item.id];
                          return newState;
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className={`w-12 h-5 text-right text-[10px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                        darkMode 
                          ? "border-gray-600 bg-gray-800/50 text-white" 
                          : "border-gray-300"
                      }`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                ) : (
                  <span className={`text-xs ${darkMode ? "text-white" : "text-gray-900"}`}>{formatCurrency(Number(item.unitPrice || 0))}</span>
                )}
              </td>
              <td className={`py-1.5 px-1.5 text-right text-xs border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>{formatCurrency(item.lineSubtotal || 0)}</td>
              <td className={`py-1.5 px-1.5 text-right text-xs border-r ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>{formatCurrency(item.itemTaxAmount || 0)}</td>
              <td className={`py-1.5 px-1.5 text-right text-xs border-r font-semibold ${darkMode ? "text-white border-gray-700" : "text-gray-900 border-gray-200"}`}>{formatCurrency(item.lineTotal || 0)}</td>
              <td className="py-1.5 px-1.5 text-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveItem(item.id)}
                  className={darkMode ? "h-5 w-5 p-0 text-red-400 hover:text-red-300 border-red-600 hover:bg-red-900/30" : "h-5 w-5 p-0 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"}
                  title="Delete item"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </td>
            </tr>
            );
          })}
          {cartItems.length === 0 && (
            <tr>
              <td colSpan={8} className={`py-8 text-center border-b ${darkMode ? "text-gray-400 border-gray-700" : "text-gray-500 border-gray-200"}`}>
                <div className="flex flex-col items-center">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className={`text-lg font-medium ${darkMode ? "text-white" : ""}`}>No items added</p>
                  <p className={`text-sm ${darkMode ? "text-gray-300" : ""}`}>Add products to start your order</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
