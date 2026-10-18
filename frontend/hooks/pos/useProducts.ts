import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  sellingPrice: number | string;
  costPrice?: number | string;
  stockBalance?: number | string;
  isActive: boolean;
  stockBalances?: Array<{
    quantity: number;
    locationId: string;
    location: {
      id: string;
      name: string;
    };
  }>;
}

export const useProducts = (locationId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [productsCache, setProductsCache] = useState<{[key: string]: Product[]}>({});

  const loadProducts = async (locationId?: string, searchTerm?: string) => {
    try {
      // Check cache first (only for non-search requests)
      if (locationId && !searchTerm && productsCache[locationId]) {
        console.log('🚀 Using cached products for location:', locationId);
        setProducts(productsCache[locationId]);
        setFilteredProducts(productsCache[locationId]);
        return productsCache[locationId];
      }

      setIsLoading(true);
      
      // Use optimized POS endpoint for faster loading
      let url = '/products/pos';
      const params = new URLSearchParams();
      if (locationId) {
        params.append('locationId', locationId);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      params.append('limit', '100'); // Load more products for POS
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('🚀 Loading products with optimized URL:', url);
      const response = await apiClient.get(url);
      const data = response.data;
      console.log('⚡ Products loaded:', data?.length, 'products for location');
      
      setProducts(data || []);
      setFilteredProducts(data || []);
      
      // Cache the result (only for non-search requests)
      if (locationId && !searchTerm) {
        setProductsCache(prev => ({
          ...prev,
          [locationId]: data || []
        }));
      }
      
      return data || [];
    } catch (error) {
      console.error('Error loading products:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const searchProducts = async (searchTerm: string) => {
    if (!locationId || searchTerm.length < 2) {
      return [];
    }

    try {
      let url = '/products/pos';
      const params = new URLSearchParams();
      params.append('locationId', locationId);
      params.append('search', searchTerm);
      params.append('limit', '20'); // Limit search results for dropdown
      
      url += `?${params.toString()}`;

      console.log('🔍 Search URL:', url);
      const response = await apiClient.get(url);
      const data = response.data;
      console.log('⚡ Search response:', data);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching products for search:', error);
      return [];
    }
  };

  const getProductStockQuantity = (product: Product): number => {
    if (!locationId) {
      return 0;
    }
    
    // Check for stockBalances array first (current structure from backend)
    if (product.stockBalances && product.stockBalances.length > 0) {
      const stockBalance = product.stockBalances[0];
      return stockBalance.quantity || 0;
    }
    
    // Fallback to stockBalance field (singular)
    if (product.stockBalance !== undefined && product.stockBalance !== null) {
      return Number(product.stockBalance);
    }
    
    return 0;
  };

  const canAddProductToCart = (product: Product): boolean => {
    const stockQuantity = getProductStockQuantity(product);
    // Handle case where isActive is undefined - default to true for POS
    const isActive = product.isActive !== undefined ? product.isActive : true;
    return isActive && stockQuantity > 0;
  };

  useEffect(() => {
    if (locationId) {
      loadProducts(locationId);
    }
  }, [locationId]);

  return {
    products,
    filteredProducts,
    isLoading,
    loadProducts,
    searchProducts,
    getProductStockQuantity,
    canAddProductToCart,
    setFilteredProducts
  };
};

