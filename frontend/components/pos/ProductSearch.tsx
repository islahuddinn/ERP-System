'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Product } from '@/hooks/pos/useProducts';
import { formatCurrency } from '@/lib/currency';

interface ProductSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onProductSelect: (product: Product) => void;
  searchResults: Product[];
  showDropdown: boolean;
  searchLoading: boolean;
  selectedIndex: number;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  getProductStockQuantity: (product: Product) => number;
}

export default function ProductSearch({
  searchTerm,
  onSearchChange,
  onProductSelect,
  searchResults,
  showDropdown,
  searchLoading,
  selectedIndex,
  onSearchFocus,
  onSearchBlur,
  onSearchKeyDown,
  getProductStockQuantity
}: ProductSearchProps) {
  return (
    <div className="flex items-center space-x-4 mb-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <div className="relative">
          <Input
            placeholder="Search Product..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={onSearchFocus}
            onBlur={onSearchBlur}
            onKeyDown={onSearchKeyDown}
            className="pl-10"
          />
          
          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {searchLoading ? (
                <div className="p-3 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((product, index) => {
                  const stock = getProductStockQuantity(product);
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={product.id}
                      onClick={() => onProductSelect(product)}
                      className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            {formatCurrency(Number(product.sellingPrice || 0))}
                          </div>
                          <div className="text-sm text-gray-500">Stock: {stock}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 text-center text-gray-500">
                  No products found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
