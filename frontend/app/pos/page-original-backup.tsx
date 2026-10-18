'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
  Search,
  CreditCard,
  Calculator,
  X,
  Plus,
  Minus,
  Trash2,
  Pause,
  FileText,
  RefreshCw,
  MapPin,
  Settings
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import { apiClient } from '@/lib/api-client';
import LocationSelectionModal from '@/components/pos/location-selection-modal';

// Types
interface Product {
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

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Location {
  id: string;
  name: string;
  address?: string;
}

interface Discount {
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  amount: number;
}

interface CartItem {
  id: string;
  productId?: string;
  itemType: 'PRODUCT' | 'SERVICE';
  itemName: string;
  sku?: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  itemTaxAmount: number;
  itemDiscountAmount: number;
  lineTotal: number;
}

export default function POSPage(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [taxRate, setTaxRate] = useState(15.0);
  const [discount, setDiscount] = useState<Discount>({ type: 'PERCENTAGE', value: 0, amount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [barcodeInput, setBarcodeInput] = useState('');
  
  // Cache state for performance
  const [productsCache, setProductsCache] = useState<{[key: string]: Product[]}>({});
  const [locationsCache, setLocationsCache] = useState<Location[] | null>(null);
  
  // Location selection modal state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Search dropdown state
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  const [searchDropdownTerm, setSearchDropdownTerm] = useState('');
  
  // Quantity input editing state
  const [editingQuantities, setEditingQuantities] = useState<{[key: string]: string}>({});
  
  // Performance optimization state
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PRODUCTS_PER_PAGE = 20;

  // Customer form state
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Bilty Address form state
  const [biltyAddress, setBiltyAddress] = useState('');
  const [biltyContact, setBiltyContact] = useState('');
  const [freightCharges, setFreightCharges] = useState(0);
  const [labour, setLabour] = useState<string | undefined>(undefined);
  const [labourExpense, setLabourExpense] = useState(0);

  // Sale completion state
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeGiven, setChangeGiven] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Receipt preview state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptCartItems, setReceiptCartItems] = useState<CartItem[]>([]);
  const [receiptTotals, setReceiptTotals] = useState<any>(null);

  // Product form state (service add)
  const [productName, setProductName] = useState('');
  const [productStock, setProductStock] = useState('');
  const [productUOM, setProductUOM] = useState<string | undefined>(undefined);
  const [productQuantity, setProductQuantity] = useState(1);
  const [productUnitPrice, setProductUnitPrice] = useState('');

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + (item.lineSubtotal || 0), 0);
  const itemDiscounts = cartItems.reduce((sum, item) => sum + (item.itemDiscountAmount || 0), 0);
  const saleDiscount = discount.amount || 0;
  const subtotalAfterDiscount = subtotal - itemDiscounts - saleDiscount;
  const taxAmount = subtotalAfterDiscount * ((taxRate || 0) / 100);
  const totalAmount = subtotalAfterDiscount + taxAmount;

  // API loaders
  const loadLocations = async () => {
    try {
      // Check cache first
      if (locationsCache) {
        console.log('🚀 Using cached locations');
        setLocations(locationsCache);
        setIsLoadingLocations(false);
        return;
      }

      setIsLoadingLocations(true);
      // Use optimized POS endpoint
      const response = await apiClient.get('/locations/pos');
      const data = response.data;
      console.log('⚡ Loaded locations from API:', data?.length);
      setLocations(data || []);
      setLocationsCache(data || []); // Cache the result
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const loadProducts = async (locationId?: string, searchTerm?: string) => {
    try {
      // Check cache first (only for non-search requests)
      if (locationId && !searchTerm && productsCache[locationId]) {
        console.log('🚀 Using cached products for location:', locationId);
        setProducts(productsCache[locationId]);
        setFilteredProducts(productsCache[locationId]);
        return productsCache[locationId];
      }

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
      if (data?.length > 0) {
        console.log('Sample product:', data[0]);
        console.log('🔍 Sample product isActive:', data[0].isActive);
      }
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
    }
  };

  // Pagination and lazy loading for products
  const loadMoreProducts = () => {
    if (isLoadingMore) return;
    
    setIsLoadingMore(true);
    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const newProducts = products.slice(startIndex, endIndex);
    
    setDisplayedProducts(prev => [...prev, ...newProducts]);
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  };

  // Initialize displayed products when products change
  useEffect(() => {
    if (products.length > 0) {
      const initialProducts = products.slice(0, PRODUCTS_PER_PAGE);
      setDisplayedProducts(initialProducts);
      setCurrentPage(1);
    }
  }, [products]);

  // Separate function for search dropdown (doesn't affect main product list)
  const fetchProductsForSearchDropdown = async (searchTerm: string) => {
    if (!selectedLocation || searchTerm.length < 2) {
      return [];
    }

    try {
      // Use optimized POS endpoint for search
      let url = '/products/pos';
      const params = new URLSearchParams();
      params.append('locationId', selectedLocation.id);
      params.append('search', searchTerm);
      params.append('limit', '20'); // Limit search results for dropdown
      
      url += `?${params.toString()}`;

      console.log('🔍 Search URL:', url);
      const response = await apiClient.get(url);
      const data = response.data;
      console.log('⚡ Search response:', data);
      
      const products = data || [];
      console.log('Extracted products:', products);
      return products;
    } catch (error) {
      console.error('Error fetching products for search:', error);
      return [];
    }
  };

  // Debounced search function for dropdown
  const searchProducts = async (searchTerm: string) => {
    if (!selectedLocation || searchTerm.length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await fetchProductsForSearchDropdown(searchTerm);
      console.log('Search results:', results);
      
      // Ensure results is an array before filtering
      if (!Array.isArray(results)) {
        console.error('Search results is not an array:', results);
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }
      
      // Filter to only show products with stock > 0
      const productsWithStock = results.filter(product => {
        const stock = getProductStockQuantity(product);
        return stock > 0;
      });
      
      console.log('Products with stock:', productsWithStock);
      setSearchResults(productsWithStock);
      setShowSearchDropdown(productsWithStock.length > 0);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
      setShowSearchDropdown(false);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input with debouncing (separate from main product list)
  const handleSearchInput = (value: string) => {
    setSearchDropdownTerm(value);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      searchProducts(value);
    }, 300);
    
    setSearchTimeout(timeout);
  };

  const loadCustomers = async () => {
    try {
      const response = await apiClient.get('/customers');
      const data = response.data;
      setCustomers(data.data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Create new customer
  const createCustomer = async () => {
    if (!customerName.trim()) {
      toast.error('Please enter customer name');
      return;
    }

    try {
      const customerData = {
        name: customerName,
        email: customerContact.includes('@') ? customerContact : undefined,
        phone: customerContact.includes('@') ? undefined : customerContact,
        address: customerAddress || undefined
      };

      const response = await apiClient.post('/customers', customerData);
      const newCustomer = response.data;

      // Add to customers list
      setCustomers(prev => [...prev, newCustomer]);
      
      // Select the new customer
      setSelectedCustomer(newCustomer);
      
      // Clear form
      setCustomerName('');
      setCustomerContact('');
      setCustomerAddress('');

      toast.success('Customer created successfully');
    } catch (error: any) {
      console.error('Error creating customer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create customer';
      toast.error(errorMessage);
    }
  };

  // Check for saved location on initial load
  useEffect(() => {
    const checkSavedLocation = () => {
      if (!session?.user) return;
      
      // Get current session info
      const currentSessionEmail = session.user.email;
      const currentSessionId = session.user.id || session.user.email;
      
      console.log('Current session:', { id: currentSessionId, email: currentSessionEmail });
      
      // Check if this is a new session (different user or new login)
      const lastSessionData = sessionStorage.getItem('pos-last-session');
      console.log('Last session data:', lastSessionData);
      
      const isNewSession = !lastSessionData || 
        lastSessionData !== JSON.stringify({ id: currentSessionId, email: currentSessionEmail });
      
      console.log('Is new session:', isNewSession);
      
      if (isNewSession) {
        // New session: clear all location data and show modal
        console.log('New session detected - clearing location data and showing modal');
        sessionStorage.removeItem('pos-selected-location');
        sessionStorage.removeItem('pos-session-id');
        sessionStorage.removeItem('pos-session-location');
        sessionStorage.setItem('pos-last-session', JSON.stringify({ 
          id: currentSessionId, 
          email: currentSessionEmail 
        }));
        setShowLocationModal(true);
        return;
      }
      
      // Same session: check if we're coming from dashboard (no saved location in this session)
      const hasLocationInThisSession = sessionStorage.getItem('pos-session-location');
      console.log('Has location in this session:', hasLocationInThisSession);
      
      if (!hasLocationInThisSession) {
        // First time opening POS in this session - show modal
        console.log('First time opening POS in this session - showing modal');
        setShowLocationModal(true);
        return;
      }
      
      // Same session with saved location: use it
      const savedLocation = sessionStorage.getItem('pos-selected-location');
      console.log('Saved location:', savedLocation);
      
      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation);
          console.log('Using saved location:', location);
          setSelectedLocation(location);
          loadProducts(location.id);
          setIsInitialLoad(false);
        } catch (error) {
          console.error('Error parsing saved location:', error);
          sessionStorage.removeItem('pos-selected-location');
          setShowLocationModal(true);
        }
      } else {
        console.log('No saved location - showing modal');
        setShowLocationModal(true);
      }
    };

    if (isInitialLoad && session) {
      checkSavedLocation();
    }
  }, [isInitialLoad, session]);

  // Load initial data
  useEffect(() => {
    loadLocations();
    loadCustomers();
  }, []);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Filter products for the main product list (independent of search dropdown)
  useEffect(() => {
    // Always show all products in the main list, no filtering based on searchTerm
    setFilteredProducts(products);
  }, [products]);

  // Barcode scanning (keeps behavior)
  useEffect(() => {
    let barcodeTimer: NodeJS.Timeout;
    if (barcodeInput.length > 0) {
      barcodeTimer = setTimeout(() => {
        if (barcodeInput.length >= 8) {
          handleBarcodeScan(barcodeInput);
        }
        setBarcodeInput('');
      }, 100);
    }
    return () => clearTimeout(barcodeTimer);
  }, [barcodeInput]);

  // Check if user is admin
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }, [session, router]);

  // Calculate change when amount paid changes
  useEffect(() => {
    if (amountPaid >= totalAmount) {
      setChangeGiven(amountPaid - totalAmount);
    } else {
      setChangeGiven(0);
    }
  }, [amountPaid, totalAmount]);

  // Debug receipt preview data
  useEffect(() => {
    if (showReceiptModal) {
      console.log('Receipt preview data:', {
        receiptData: receiptData?.receipt?.id,
        receiptCartItems: receiptCartItems.length,
        receiptTotals: receiptTotals?.totalAmount,
        completedSale: completedSale?.saleNumber
      });
    }
  }, [showReceiptModal, receiptData, receiptCartItems, receiptTotals, completedSale]);

  // Show loading while checking session
  if (session === undefined) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS system...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (session && session.user?.role !== 'ADMIN') {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin privileges required to access POS system.</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }


  const handleBarcodeScan = async (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      if (!canAddProductToCart(product)) {
        toast.error('Product is out of stock or inactive');
        return;
      }
      addToCart(product);
    } else {
      toast.error('Product not found');
    }
  };

  // Helper function to get stock quantity for a product at the selected location
  const getProductStockQuantity = (product: Product): number => {
    if (!selectedLocation) {
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

  // Helper function to check if product can be added to cart
  const canAddProductToCart = (product: Product): boolean => {
    const stockQuantity = getProductStockQuantity(product);
    // Handle case where isActive is undefined - default to true for POS
    const isActive = product.isActive !== undefined ? product.isActive : true;
    return isActive && stockQuantity > 0;
  };

  const addToCart = (product: Product) => {
    // Check if product can be added
    if (!canAddProductToCart(product)) {
      toast.error('Cannot add product: Out of stock or inactive');
      return;
    }

    const existingItem = cartItems.find(item => item.productId === product.id);
    if (existingItem) {
      const currentStock = getProductStockQuantity(product);
      if (existingItem.quantity + 1 > currentStock) {
        toast.error('Insufficient stock available');
        return;
      }
      updateQuantity(existingItem.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        id: `item_${Date.now()}`,
        productId: product.id,
        itemType: 'PRODUCT',
        itemName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        quantity: 1,
        unitPrice: Number(product.sellingPrice || 0),
        lineSubtotal: Number(product.sellingPrice || 0),
        itemTaxAmount: Number(product.sellingPrice || 0) * (taxRate / 100),
        itemDiscountAmount: 0,
        lineTotal: Number(product.sellingPrice || 0) + (Number(product.sellingPrice || 0) * (taxRate / 100))
      };
      setCartItems(prev => [...prev, newItem]);
    }
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    
    // Check stock availability for product items
    const cartItem = cartItems.find(item => item.id === itemId);
    if (cartItem && cartItem.productId) {
      const product = products.find(p => p.id === cartItem.productId);
      if (product) {
        const currentStock = getProductStockQuantity(product);
        if (newQuantity > currentStock) {
          toast.error(`Insufficient stock! Available: ${currentStock}, Requested: ${newQuantity}`);
          return;
        }
      }
    }
    
    setCartItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = { ...item, quantity: newQuantity };
        updatedItem.lineSubtotal = updatedItem.unitPrice * newQuantity;
        updatedItem.itemTaxAmount = updatedItem.lineSubtotal * (taxRate / 100);
        updatedItem.lineTotal = updatedItem.lineSubtotal + updatedItem.itemTaxAmount;
        return updatedItem;
      }
      return item;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setDiscount({ type: 'PERCENTAGE', value: 0, amount: 0 });
  };

  // Location selection handlers
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationModal(false);
    setIsInitialLoad(false);
    // Save location for this session
    sessionStorage.setItem('pos-selected-location', JSON.stringify(location));
    sessionStorage.setItem('pos-session-location', 'true');
    // Reload products for the selected location
    loadProducts(location.id);
    toast.success(`Switched to ${location.name}`);
  };

  const handleLocationSwitch = () => {
    setShowLocationModal(true);
  };

  const handleLocationModalClose = () => {
    if (!selectedLocation) {
      // If no location is selected and user tries to close, redirect to dashboard
      router.push('/dashboard');
    } else {
      setShowLocationModal(false);
    }
  };

  // Function to clear session data (for testing)
  const clearSessionData = () => {
    sessionStorage.removeItem('pos-selected-location');
    sessionStorage.removeItem('pos-session-id');
    sessionStorage.removeItem('pos-session-location');
    sessionStorage.removeItem('pos-last-session');
    console.log('Session data cleared');
    toast.success('Session data cleared');
  };

  // Handle product selection from search dropdown
  const handleProductSelect = (product: Product) => {
    addToCart(product);
    setSearchDropdownTerm('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSelectedSearchIndex(-1);
    toast.success(`${product.name} added to cart`);
  };

  // Handle search input focus/blur
  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding dropdown to allow clicks on dropdown items
    setTimeout(() => {
      setShowSearchDropdown(false);
    }, 200);
  };

  // Handle keyboard navigation in search dropdown
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showSearchDropdown || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSearchIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSearchIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSearchIndex >= 0 && selectedSearchIndex < searchResults.length) {
          handleProductSelect(searchResults[selectedSearchIndex]);
        }
        break;
      case 'Escape':
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
        break;
    }
  };

  const addServiceToCart = () => {
    if (!productName.trim() || !productUnitPrice.trim()) {
      toast.error('Please enter product name and unit price');
      return;
    }
    const unitPrice = parseFloat(productUnitPrice);
    if (isNaN(unitPrice)) {
      toast.error('Please enter a valid unit price');
      return;
    }
    const newItem: CartItem = {
      id: `service_${Date.now()}`,
      itemType: 'SERVICE',
      itemName: productName,
      quantity: productQuantity,
      unitPrice: unitPrice,
      lineSubtotal: unitPrice * productQuantity,
      itemTaxAmount: (unitPrice * productQuantity) * (taxRate / 100),
      itemDiscountAmount: 0,
      lineTotal: (unitPrice * productQuantity) + ((unitPrice * productQuantity) * (taxRate / 100))
    };
    setCartItems(prev => [...prev, newItem]);
    setProductName('');
    setProductStock('');
    setProductUOM('');
    setProductQuantity(1);
    setProductUnitPrice('');
  };

  // Complete sale function
  const completeSale = async () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before completing sale');
      return;
    }

    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    // Show payment modal
    setShowPaymentModal(true);
  };

  // Process payment and create sale
  const processPayment = async () => {
    if (amountPaid < totalAmount) {
      toast.error('Amount paid is less than total amount');
      return;
    }

    if (!selectedLocation) {
      toast.error('No location selected');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('No items in cart');
      return;
    }

    setIsCompletingSale(true);
    try {
      // Validate required data
      if (!selectedLocation?.id) {
        throw new Error('No location selected');
      }
      
      if (cartItems.length === 0) {
        throw new Error('No items in cart');
      }
      
      // Validate cart items
      for (const item of cartItems) {
        if (!item.itemName || !item.quantity || !item.unitPrice) {
          throw new Error(`Invalid item data: ${item.itemName}`);
        }
        if (item.itemType === 'PRODUCT' && !item.productId) {
          throw new Error(`Product item missing productId: ${item.itemName}`);
        }
      }

      // Prepare sale data
      const saleData = {
        saleType: 'RETAIL',
        customerId: selectedCustomer?.id || undefined,
        locationId: selectedLocation.id,
        items: cartItems.map(item => ({
          productId: item.productId || undefined,
          itemType: item.itemType,
          itemName: item.itemName,
          sku: item.sku || undefined,
          barcode: item.barcode || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: 0, // We don't have cost price in frontend
          itemTaxRate: taxRate,
          itemDiscountType: 'PERCENTAGE',
          itemDiscountRate: 0,
          notes: ''
        })),
        payments: [{
          paymentMethod: paymentMethod,
          amount: amountPaid,
          referenceNumber: paymentMethod === 'CARD' ? 'CARD' + Date.now().toString().slice(-4) : undefined,
          notes: saleNotes
        }],
        taxRate: taxRate,
        discountType: discount.type,
        discountValue: discount.value,
        notes: saleNotes
      };

      console.log('Creating sale with data:', saleData);
      console.log('Sale items:', saleData.items);
      console.log('Payments:', saleData.payments);

      // Create sale
      const response = await apiClient.post('/pos/sales', saleData);
      const sale = response.data;

      console.log('Sale created successfully:', sale);

      // Generate receipt
      let receipt = null;
      try {
        console.log('Generating receipt for sale:', sale.id);
        const receiptResponse = await apiClient.post(`/receipts/generate/${sale.id}?format=PDF`);
        receipt = receiptResponse.data;
        console.log('Receipt generated successfully:', receipt);
        
        // Validate receipt response
        if (!receipt || !receipt.receipt) {
          console.warn('Invalid receipt response:', receipt);
          throw new Error('Invalid receipt response from server');
        }
        
        // Store receipt data for preview
        setReceiptData(receipt);
        setCompletedSale(sale);
        
      } catch (receiptError: any) {
        console.error('Error generating receipt:', receiptError);
        console.error('Receipt error details:', receiptError?.response?.data);
        console.error('Receipt error status:', receiptError?.response?.status);
        
        // Show user-friendly error message
        toast.error('Receipt generation failed, but sale was completed successfully. You can generate receipts later from the sales history.');
        // Don't fail the sale if receipt generation fails
      }

      // Store cart data and totals for receipt preview BEFORE clearing
      console.log('Storing receipt data:', {
        cartItems: cartItems.length,
        subtotal,
        totalAmount,
        amountPaid,
        changeGiven,
        selectedCustomer: selectedCustomer?.name,
        selectedLocation: selectedLocation?.name
      });
      
      setReceiptCartItems([...cartItems]);
      setReceiptTotals({
        subtotal,
        itemDiscounts,
        saleDiscount,
        subtotalAfterDiscount,
        taxAmount,
        totalAmount,
        amountPaid,
        changeGiven,
        taxRate,
        discount,
        selectedCustomer,
        selectedLocation
      });

      // Clear cart and reset form
      setCartItems([]);
      setSelectedCustomer(null);
      setDiscount({ type: 'PERCENTAGE', value: 0, amount: 0 });
      setAmountPaid(0);
      setChangeGiven(0);
      setSaleNotes('');
      setShowPaymentModal(false);

      // Show success message and receipt preview
      if (receipt?.receipt?.id) {
        toast.success(`Sale completed successfully! Sale #${sale.saleNumber}`);
        // Show receipt preview modal
        setShowReceiptModal(true);
      } else {
        toast.success(`Sale completed successfully! Sale #${sale.saleNumber}`);
        // Show receipt preview modal even if receipt generation failed
        setShowReceiptModal(true);
      }
      
    } catch (error: any) {
      console.error('Error creating sale:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      let errorMessage = 'Failed to complete sale';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(`Sale failed: ${errorMessage}`);
    } finally {
      setIsCompletingSale(false);
    }
  };

  // Loading screens
  if (isLoadingLocations) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS system...</p>
        </div>
      </div>
    );
  }

  // Show location selection modal if no location is selected
  if (!selectedLocation || showLocationModal) {
    return (
      <>
        <LocationSelectionModal
          isOpen={showLocationModal || !selectedLocation}
          onLocationSelect={handleLocationSelect}
          onClose={handleLocationModalClose}
        />
        {!selectedLocation && !showLocationModal && (
          <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Locations Available</h2>
              <p className="text-gray-600 mb-4">Please add a location before using the POS system.</p>
              <Button onClick={() => router.push('/dashboard/locations')}>Go to Locations</Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Main UI (refactored layout to match screenshots)
  return (
    <>
      <LocationSelectionModal
        isOpen={showLocationModal}
        onLocationSelect={handleLocationSelect}
        onClose={handleLocationModalClose}
      />
      <div className="h-screen w-full bg-gray-900">
      {/* Top header */}
      <div className="bg-blue-600 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <h1 className="text-white text-2xl font-bold">Point Of Sale</h1>
          <div className="flex items-center gap-2 bg-blue-700 px-3 py-1 rounded-md">
            <MapPin className="w-4 h-4 text-blue-200" />
            <span className="text-blue-100 text-sm font-medium">{selectedLocation.name}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleLocationSwitch}
              className="text-blue-200 hover:text-white hover:bg-blue-600 p-1 h-6 w-6"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment
          </Button>
          <Button className="bg-gray-200 text-gray-800 flex items-center gap-2">
            <Pause className="w-4 h-4" /> Hold
          </Button>
          <Button className="bg-orange-500 text-white flex items-center gap-2">
            <FileText className="w-4 h-4" /> View Invoice
          </Button>
          <Button className="bg-cyan-500 text-white flex items-center gap-2">
            <Calculator className="w-4 h-4" /> Cash Register
          </Button>
          <Button className="bg-cyan-500 text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
          <Button className="bg-green-600 text-white flex items-center gap-2">
            <FileText className="w-4 h-4" /> Hold Invoice
          </Button>
          <Button 
            className="bg-red-600 text-white flex items-center gap-2"
            onClick={() => router.push('/dashboard')}
          >
            <X className="w-4 h-4" /> Close
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-2">
        <div className="grid grid-cols-12 gap-2 h-full">
          {/* Left Panel - Product Search */}
          <div className="col-span-4 flex flex-col gap-2">
          {/* Product Search Card */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-3">
              <h3 className="text-base font-semibold mb-2 text-gray-900">Search Product By Name/Barcode</h3>
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <div className="relative">
                    <Input
                      placeholder="Search Product..."
                      value={searchDropdownTerm}
                      onChange={(e) => {
                        handleSearchInput(e.target.value);
                        setBarcodeInput(e.target.value);
                        setSelectedSearchIndex(-1);
                      }}
                      onFocus={handleSearchFocus}
                      onBlur={handleSearchBlur}
                      onKeyDown={handleSearchKeyDown}
                      className="pl-10"
                    />
                    
                    {/* Search Dropdown */}
                    {showSearchDropdown && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {searchLoading ? (
                          <div className="p-3 text-center text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                            <span className="ml-2">Searching...</span>
                          </div>
                        ) : searchResults.length > 0 ? (
                          searchResults.map((product, index) => {
                            const stock = getProductStockQuantity(product);
                            const isSelected = index === selectedSearchIndex;
                            return (
                              <div
                                key={product.id}
                                onClick={() => handleProductSelect(product)}
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
                                    <div className="font-semibold text-green-600">Rs. {Number(product.sellingPrice || 0).toFixed(2)}</div>
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
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Product</label>
                  <Input placeholder="Product" value={productName} onChange={(e) => setProductName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Stock</label>
                  <Input placeholder="Stock" value={productStock} onChange={(e) => setProductStock(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">UOM</label>
                  <Select value={productUOM} onValueChange={setProductUOM}>
                    <SelectTrigger>
                      <SelectValue placeholder="Peices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">PCS</SelectItem>
                      <SelectItem value="kg">KG</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="pieces">Peices</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Quantity</label>
                  <Input type="number" value={productQuantity} onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Unit Price</label>
                  <Input placeholder="Unit Price" value={productUnitPrice} onChange={(e) => setProductUnitPrice(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={addServiceToCart} className="bg-green-600 hover:bg-green-700 text-white">
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Product List */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-3">
              <h3 className="text-base font-semibold mb-2 text-gray-900">Available Products</h3>
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
                            Rs. {Number(product.sellingPrice || 0).toFixed(2)}
                          </td>
                          <td className={`py-2 px-3 text-right text-xs font-semibold border-r border-gray-200 ${isZeroStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {stockQuantity}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <Button 
                              size="sm" 
                              onClick={() => addToCart(product)} 
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
                {displayedProducts.length < products.length && (
                  <div className="p-4 text-center border-t border-gray-200">
                    <Button
                      onClick={loadMoreProducts}
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
            </CardContent>
          </Card>
        </div>

          {/* Middle Panel - Customer and Builty Address Cards Side by Side */}
          <div className="col-span-3 flex flex-col gap-2">
          {/* Customer Details Card */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-3">
              <h3 className="text-base font-semibold mb-2 text-gray-900">Customer</h3>
              <div className="flex items-center space-x-4 mb-3">
                <div className="flex-1">
                  <Select value={selectedCustomer?.id || undefined} onValueChange={(value) => {
                    const customer = customers.find(c => c.id === value);
                    setSelectedCustomer(customer || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="walk_in_customer s/o Nil | NILL" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in Customer</SelectItem>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name} | {customer.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={createCustomer}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={!customerName.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Name</label>
                  <Input placeholder="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Contact#</label>
                  <Input placeholder="Contact#" value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 mb-1">Address</label>
                <textarea 
                  className="w-full p-2 border border-gray-300 rounded-md" 
                  rows={3}
                  placeholder="Address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Builty Address Card */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-3">
              <h3 className="text-base font-semibold mb-2 text-gray-900">Builty Address</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Builty Address</label>
                  <Input placeholder="Builty Address" value={biltyAddress} onChange={(e) => setBiltyAddress(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Builty Contact#</label>
                  <Input placeholder="Builty Contact#" value={biltyContact} onChange={(e) => setBiltyContact(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Labour</label>
                  <Select value={labour} onValueChange={setLabour}>
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
                  <Input type="number" value={freightCharges} onChange={(e) => setFreightCharges(parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-900 mb-1">Labour Expense</label>
                  <Input type="number" value={labourExpense} onChange={(e) => setLabourExpense(parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

          {/* Right Panel - Order Summary */}
          <div className="col-span-5">
          {/* Item List and Order Summary Card */}
          <Card className="bg-white shadow-lg">
            <CardContent className="p-3">
              {/* Item List */}
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-2 text-gray-900">Item List</h3>
                <div className="h-80 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300 bg-gray-50">
                        <th className="text-left py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">Item Name</th>
                        <th className="text-center py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">QTY</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">Retail</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">Discount</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">Unit Price</th>
                        <th className="text-right py-2 px-2 text-xs text-gray-900 font-semibold border-r border-gray-200">Total Price</th>
                        <th className="text-center py-2 px-2 text-xs text-gray-900 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item) => (
                        <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="py-2 px-2 text-xs text-gray-900 border-r border-gray-200 font-medium">{item.itemName}</td>
                          <td className="py-2 px-2 text-center border-r border-gray-200">
                            <div className="flex items-center justify-center space-x-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="h-5 w-5 p-0 border-gray-300 hover:bg-gray-100"
                              >
                                <Minus className="h-2 w-2" />
                              </Button>
                              <Input
                                type="number"
                                value={editingQuantities[item.id] !== undefined ? editingQuantities[item.id] : item.quantity.toString()}
                                onChange={(e) => {
                                  setEditingQuantities(prev => ({
                                    ...prev,
                                    [item.id]: e.target.value
                                  }));
                                }}
                                onFocus={() => {
                                  setEditingQuantities(prev => ({
                                    ...prev,
                                    [item.id]: item.quantity.toString()
                                  }));
                                }}
                                onBlur={() => {
                                  const inputValue = editingQuantities[item.id];
                                  if (inputValue !== undefined) {
                                    const newQuantity = parseInt(inputValue) || 1;
                                    if (newQuantity >= 1) {
                                      // Check stock before updating
                                      if (item.productId) {
                                        const product = products.find(p => p.id === item.productId);
                                        if (product) {
                                          const currentStock = getProductStockQuantity(product);
                                          if (newQuantity > currentStock) {
                                            toast.error(`Insufficient stock! Available: ${currentStock}, Requested: ${newQuantity}`);
                                            // Reset to current quantity
                                            setEditingQuantities(prev => ({
                                              ...prev,
                                              [item.id]: item.quantity.toString()
                                            }));
                                            return;
                                          }
                                        }
                                      }
                                      updateQuantity(item.id, newQuantity);
                                    }
                                    // Clear editing state
                                    setEditingQuantities(prev => {
                                      const newState = { ...prev };
                                      delete newState[item.id];
                                      return newState;
                                    });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  }
                                }}
                                className="w-12 h-6 text-center text-xs border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                min="1"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="h-5 w-5 p-0 border-gray-300 hover:bg-gray-100"
                              >
                                <Plus className="h-2 w-2" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-right text-xs text-gray-900 border-r border-gray-200">Rs. {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-xs text-gray-900 border-r border-gray-200">Rs. {item.itemDiscountAmount.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-xs text-gray-900 border-r border-gray-200">Rs. {item.unitPrice.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right text-xs text-gray-900 border-r border-gray-200 font-semibold">Rs. {item.lineTotal.toFixed(2)}</td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeFromCart(item.id)}
                              className="h-5 w-5 p-0 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-2 w-2" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {cartItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-gray-500 border-b border-gray-200">
                            <div className="flex flex-col items-center">
                              <div className="text-4xl mb-2">🛒</div>
                              <p className="text-lg font-medium">No items added</p>
                              <p className="text-sm">Add products to start your order</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Order Summary */}
              <div>
                <h3 className="text-base font-semibold mb-3 text-gray-900">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-900">Order Total:</span>
                    <span className="text-xs text-gray-900">Rs. {Number(subtotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-900">Discount:</span>
                    <Input 
                      type="number" 
                      className="w-20 text-right" 
                      value={discount.value}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        setDiscount(prev => ({
                          ...prev,
                          value,
                          amount: prev.type === 'PERCENTAGE' ? (subtotal * value / 100) : value
                        }));
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="discountType" 
                        checked={discount.type === 'FIXED'}
                        onChange={() => setDiscount(prev => ({ ...prev, type: 'FIXED' }))}
                        className="mr-2"
                      />
                      <span className="text-gray-900">Cash</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="radio" 
                        name="discountType" 
                        checked={discount.type === 'PERCENTAGE'}
                        onChange={() => setDiscount(prev => ({ ...prev, type: 'PERCENTAGE' }))}
                        className="mr-2"
                      />
                      <span className="text-gray-900">%age</span>
                    </label>
                    <span className="text-gray-900">Rs. {Number(discount.amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-900">Pre. Balance:</span>
                    <span className="text-xs text-gray-900">Rs. 0.00</span>
                  </div>
                  <div className="flex justify-between text-blue-600 font-semibold">
                    <span className="text-xs">Net Payable:</span>
                    <span className="text-xs">Rs. {Number(totalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span className="text-xs">Paid:</span>
                    <span className="text-xs">Rs. 0.00</span>
                  </div>
                  <div className="flex justify-between text-blue-600">
                    <span className="text-xs">Balance:</span>
                    <span className="text-xs">Rs. 0.00</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Note</label>
                    <Input placeholder="Note" />
                  </div>
                  <div className="mt-6">
                    <Button 
                      onClick={completeSale}
                      disabled={cartItems.length === 0 || isCompletingSale}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isCompletingSale ? 'Processing...' : 'Complete'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Complete Payment</h2>
                <p className="text-sm text-gray-600 mt-1">Total Amount: Rs. {totalAmount.toFixed(2)}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Payment Method</label>
                <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Amount Paid */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Amount Paid</label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    value={amountPaid === 0 ? '' : amountPaid}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setAmountPaid(0);
                      } else {
                        const numValue = parseFloat(value);
                        if (!isNaN(numValue)) {
                          setAmountPaid(numValue);
                        }
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && amountPaid >= totalAmount) {
                        processPayment();
                      }
                    }}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    onClick={() => setAmountPaid(totalAmount)}
                    variant="outline"
                    className="px-3"
                    title="Set exact amount (Enter key)"
                  >
                    Exact
                  </Button>
                </div>
              </div>

              {/* Change Given */}
              {changeGiven > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Change Given:</span>
                    <span className="text-lg font-bold text-green-900">Rs. {changeGiven.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* Sale Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Sale Notes (Optional)</label>
                <textarea
                  className="w-full p-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Add notes for this sale..."
                  value={saleNotes}
                  onChange={(e) => setSaleNotes(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 hover:border-gray-400 px-6 py-2 font-medium transition-colors"
              >
                Cancel
              </Button>
              <Button
                onClick={processPayment}
                disabled={amountPaid < totalAmount || isCompletingSale}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:cursor-not-allowed px-6 py-2"
              >
                {isCompletingSale ? 'Processing...' : 'Complete Sale'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Sale Receipt</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Sale #{completedSale?.saleNumber} - {new Date().toLocaleString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {receiptData?.receipt?.id ? (
                <div className="space-y-6">
                  {/* Company Header */}
                  <div className="text-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">MALIND TECH</h1>
                    <p className="text-gray-600">Inventory Management System</p>
                    <p className="text-sm text-gray-500">123 Business Street, Tech City</p>
                  </div>

                  {/* Sale Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Sale Information</h3>
                      <p className="text-sm text-gray-600">Receipt #: {receiptData.receipt.receiptNumber}</p>
                      <p className="text-sm text-gray-600">Sale #: {completedSale?.saleNumber}</p>
                      <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                      <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.name || selectedLocation?.name}</p>
                      <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.address || selectedLocation?.address}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {receiptTotals?.selectedCustomer && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                      <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.name}</p>
                      {receiptTotals.selectedCustomer.email && (
                        <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.email}</p>
                      )}
                      {receiptTotals.selectedCustomer.phone && (
                        <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.phone}</p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-gray-900 font-semibold">Item</th>
                            <th className="text-center py-2 text-gray-900 font-semibold">Qty</th>
                            <th className="text-right py-2 text-gray-900 font-semibold">Price</th>
                            <th className="text-right py-2 text-gray-900 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptCartItems.length > 0 ? receiptCartItems.map((item, index) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-2 text-gray-900">{item.itemName}</td>
                              <td className="text-center py-2 text-gray-900">{item.quantity}</td>
                              <td className="text-right py-2 text-gray-900">Rs. {item.unitPrice.toFixed(2)}</td>
                              <td className="text-right py-2 text-gray-900">Rs. {item.lineTotal.toFixed(2)}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-gray-500">
                                No items found. receiptCartItems.length = {receiptCartItems.length}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900">Subtotal:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {receiptTotals?.discount?.amount > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-900">Discount:</span>
                        <span className="text-gray-900">-Rs. {receiptTotals.discount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900">Tax ({receiptTotals?.taxRate || 0}%):</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.taxAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-900">Amount Paid:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.amountPaid?.toFixed(2) || '0.00'}</span>
                    </div>
                    {receiptTotals?.changeGiven > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-900">Change:</span>
                        <span className="text-gray-900">Rs. {receiptTotals.changeGiven.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">
                      Payment Method: {paymentMethod}
                    </p>
                    {saleNotes && (
                      <p className="text-sm text-gray-600 mt-2">
                        Notes: {saleNotes}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Company Header */}
                  <div className="text-center border-b pb-4">
                    <h1 className="text-3xl font-bold text-gray-900">MALIND TECH</h1>
                    <p className="text-gray-600">Inventory Management System</p>
                    <p className="text-sm text-gray-500">123 Business Street, Tech City</p>
                  </div>

                  {/* Sale Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Sale Information</h3>
                      <p className="text-sm text-gray-600">Sale #: {completedSale?.saleNumber}</p>
                      <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                      <p className="text-sm text-gray-600">Time: {new Date().toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Location</h3>
                      <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.name}</p>
                      <p className="text-sm text-gray-600">{receiptTotals?.selectedLocation?.address}</p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {receiptTotals?.selectedCustomer && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Customer</h3>
                      <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.name}</p>
                      {receiptTotals.selectedCustomer.email && (
                        <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.email}</p>
                      )}
                      {receiptTotals.selectedCustomer.phone && (
                        <p className="text-sm text-gray-600">{receiptTotals.selectedCustomer.phone}</p>
                      )}
                    </div>
                  )}

                  {/* Items */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-gray-900 font-semibold">Item</th>
                            <th className="text-center py-2 text-gray-900 font-semibold">Qty</th>
                            <th className="text-right py-2 text-gray-900 font-semibold">Price</th>
                            <th className="text-right py-2 text-gray-900 font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptCartItems.length > 0 ? receiptCartItems.map((item, index) => (
                            <tr key={item.id} className="border-b">
                              <td className="py-2 text-gray-900">{item.itemName}</td>
                              <td className="text-center py-2 text-gray-900">{item.quantity}</td>
                              <td className="text-right py-2 text-gray-900">Rs. {item.unitPrice.toFixed(2)}</td>
                              <td className="text-right py-2 text-gray-900">Rs. {item.lineTotal.toFixed(2)}</td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={4} className="py-4 text-center text-gray-500">
                                No items found. receiptCartItems.length = {receiptCartItems.length}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900">Subtotal:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    {receiptTotals?.discount?.amount > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-900">Discount:</span>
                        <span className="text-gray-900">-Rs. {receiptTotals.discount.amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-900">Tax ({receiptTotals?.taxRate || 0}%):</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.taxAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span className="text-gray-900">Total:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-900">Amount Paid:</span>
                      <span className="text-gray-900">Rs. {receiptTotals?.amountPaid?.toFixed(2) || '0.00'}</span>
                    </div>
                    {receiptTotals?.changeGiven > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-900">Change:</span>
                        <span className="text-gray-900">Rs. {receiptTotals.changeGiven.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="border-t pt-4">
                    <p className="text-sm text-gray-600">
                      Payment Method: {paymentMethod}
                    </p>
                    {saleNotes && (
                      <p className="text-sm text-gray-600 mt-2">
                        Notes: {saleNotes}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer with Download and Print buttons */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <Button
                onClick={() => setShowReceiptModal(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 hover:border-gray-400 px-6 py-2 font-medium transition-colors"
              >
                Close
              </Button>
              
              <div className="flex space-x-3">
                {receiptData?.receipt?.id && (
                  <>
                    <Button
                      onClick={() => {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                        const cleanBaseUrl = baseUrl.replace('/api', '');
                        const receiptUrl = `${cleanBaseUrl}/api/receipts/${receiptData.receipt.id}/download`;
                        window.open(receiptUrl, '_blank');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => {
                        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
                        const cleanBaseUrl = baseUrl.replace('/api', '');
                        const receiptUrl = `${cleanBaseUrl}/api/receipts/${receiptData.receipt.id}/download`;
                        const printWindow = window.open(receiptUrl, '_blank');
                        if (printWindow) {
                          printWindow.onload = () => {
                            printWindow.print();
                          };
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Print Receipt
                    </Button>
                  </>
                )}
                {!receiptData?.receipt?.id && (
                  <Button
                    onClick={async () => {
                      try {
                        const receiptResponse = await apiClient.post(`/receipts/generate/${completedSale.id}?format=PDF`);
                        const receipt = receiptResponse.data;
                        setReceiptData(receipt);
                        toast.success('Receipt generated successfully!');
                      } catch (error) {
                        console.error('Error generating receipt:', error);
                        toast.error('Failed to generate receipt. Please try again.');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
