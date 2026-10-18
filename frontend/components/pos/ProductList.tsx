'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/hooks/pos/useProducts';
import { formatCurrency } from '@/lib/currency';

interface ProductListProps {
  products: Product[];
  displayedProducts: Product[];
  onAddToCart: (product: Product) => void;
  getProductStockQuantity: (product: Product) => number;
  canAddProductToCart: (product: Product) => boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  hasMoreProducts: boolean;
}

export default function ProductList({
  products,
  displayedProducts,
  onAddToCart,
  getProductStockQuantity,
  canAddProductToCart,
  onLoadMore,
  isLoadingMore,
  hasMoreProducts
}: ProductListProps) {
  return (
    <div className="h-80 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="text-left py-3 px-3 text-xs text-gray-900 font-semibold border-r border-gray-300">Name</th>
            <th className="text-right py-3 px-3 text-xs text-gray-900 font-semibold border-r border-gray-300">Price</th>
            <th className="text-right py-3 px-3 text-xs text-gray-900 font-semibold border-r border-gray-300">Stock</th>
            <th className="text-center py-3 px-3 text-xs text-gray-900 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {displayedProducts.map(product => {
            const stockQuantity = getProductStockQuantity(product);
            const canAdd = canAddProductToCart(product);
            const isZeroStock = stockQuantity === 0;
            
            return (
              <tr 
                key={product.id} 
                className={`border-b border-gray-200 hover:bg-gray-50 ${isZeroStock ? 'bg-red-50' : ''}`}
              >
                <td className={`py-2 px-3 text-xs border-r border-gray-200 ${isZeroStock ? 'text-red-600' : 'text-gray-900'}`}>
                  {product.name}
                </td>
                <td className={`py-2 px-3 text-right text-xs border-r border-gray-200 ${isZeroStock ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(Number(product.sellingPrice || 0))}
                </td>
                <td className={`py-2 px-3 text-right text-xs font-semibold border-r border-gray-200 ${isZeroStock ? 'text-red-600' : 'text-gray-900'}`}>
                  {stockQuantity}
                </td>
                <td className="py-2 px-3 text-center">
                  <Button 
                    size="sm" 
                    onClick={() => onAddToCart(product)} 
                    disabled={!canAdd}
                    className={`${
                      canAdd 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {canAdd ? 'Add' : 'Out of Stock'}
                  </Button>
                </td>
              </tr>
            );
          })}
          {displayedProducts.length === 0 && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-gray-500 border-r border-gray-200">
                No products found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      
      {/* Load More Button */}
      {hasMoreProducts && (
        <div className="p-4 text-center border-t border-gray-200">
          <Button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            variant="outline"
            className="w-full"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${products.length - displayedProducts.length} remaining)`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
