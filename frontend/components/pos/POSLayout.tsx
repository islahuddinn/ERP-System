'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useProducts } from '@/hooks/pos/useProducts';
import { useCart } from '@/hooks/pos/useCart';
import { useCustomers, Customer } from '@/hooks/pos/useCustomers';
import { useBrokers } from '@/hooks/useBrokers';
import { useLocations } from '@/hooks/pos/useLocations';
import { useSales } from '@/hooks/pos/useSales';
import { useHeldInvoices, HeldInvoice } from '@/hooks/pos/useHeldInvoices';
import ProductSearch from './ProductSearch';
import ServiceForm from './ServiceForm';
import ProductList from './ProductList';
import CustomerForm from './CustomerForm';
import BrokerForm from './BrokerForm';
import BiltyForm from './BiltyForm';
import CartItems from './CartItems';
import OrderSummary from './OrderSummary';
import PaymentModal from './PaymentModal';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import HoldInvoiceModal from './HoldInvoiceModal';
import HeldInvoicesListModal from './HeldInvoicesListModal';
import InvoicePreviewModal from './InvoicePreviewModal';
import POSHeader from './POSHeader';
import { Product } from '@/hooks/pos/useProducts';
import { CartItem } from '@/hooks/pos/useCart';
import { BiltyFormData, InvoiceData } from '@/types/pos';

interface POSLayoutProps {
  selectedLocation: any;
  onLocationSwitch: () => void;
  onNavigateToDashboard: () => void;
  onHoldInvoice?: () => void;
  onViewHeldInvoices?: () => void;
}

export default function POSLayout({
  selectedLocation,
  onLocationSwitch,
  onNavigateToDashboard,
  onHoldInvoice: onHoldInvoiceProp,
  onViewHeldInvoices: onViewHeldInvoicesProp,
}: POSLayoutProps) {
  // Hooks
  const {
    products,
    filteredProducts,
    isLoading: productsLoading,
    loadProducts,
    searchProducts,
    getProductStockQuantity,
    canAddProductToCart
  } = useProducts(selectedLocation?.id);

  const {
    cartItems,
    discount,
    setDiscount,
    subtotal,
    itemDiscounts,
    saleDiscount,
    subtotalAfterDiscount,
    taxAmount,
    taxRate,
    setTaxRate,
    totalAmount,
    addToCart,
    updateQuantity,
    updateUnitPrice,
    updateItemDiscount,
    removeFromCart,
    clearCart,
    addServiceToCart,
    setCartItems
  } = useCart(0); // Start with 0% tax by default, like discount field

  const {
    customers,
    selectedCustomer,
    setSelectedCustomer,
    createCustomer,
    searchCustomers
  } = useCustomers();

  const { data: brokers = [] } = useBrokers();


  const {
    isCompletingSale,
    showReceiptModal,
    setShowReceiptModal,
    completedSale,
    receiptData,
    setReceiptData,
    receiptCartItems,
    setReceiptCartItems,
    receiptTotals,
    setReceiptTotals,
    processPayment,
    generateReceipt,
    downloadReceipt,
    printReceipt
  } = useSales();

  // Local state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // Customer search state
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [showCustomerSearchDropdown, setShowCustomerSearchDropdown] = useState(false);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [customerSearchTimeout, setCustomerSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [selectedCustomerSearchIndex, setSelectedCustomerSearchIndex] = useState(-1);
  // Add refs for blur handler timeouts to track and clean them up
  const searchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const customerSearchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [editingQuantities, setEditingQuantities] = useState<{ [key: string]: string }>({});
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
  const [amountPaid, setAmountPaid] = useState(0);
  const [changeGiven, setChangeGiven] = useState(0);
  const [saleNotes, setSaleNotes] = useState('');
  const [biltyData, setBiltyData] = useState<BiltyFormData>({
    address: '',
    contact: '',
    labour: undefined,
    freightCharges: 0,
    labourExpense: 0
  });
  const [isCashRegisterOpen, setIsCashRegisterOpen] = useState<boolean | null>(null);
  const [showCashWarning, setShowCashWarning] = useState(true);
  const [isCheckingCash, setIsCheckingCash] = useState(false);
  const [showHoldInvoiceModal, setShowHoldInvoiceModal] = useState(false);
  const [showHeldInvoicesListModal, setShowHeldInvoicesListModal] = useState(false);
  const [showInvoicePreviewModal, setShowInvoicePreviewModal] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);

  // Broker state
  const [salespersonType, setSalespersonType] = useState<'CUSTOMER' | 'BROKER'>('CUSTOMER');
  const [selectedBroker, setSelectedBroker] = useState<any>(null);
  const [brokerSearchTerm, setBrokerSearchTerm] = useState('');
  const [brokerSearchResults, setBrokerSearchResults] = useState<any[]>([]);
  const [showBrokerSearchDropdown, setShowBrokerSearchDropdown] = useState(false);
  const [brokerSearchLoading, setBrokerSearchLoading] = useState(false);
  const brokerSearchBlurTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const { holdInvoice } = useHeldInvoices();

  const PRODUCTS_PER_PAGE = 20;

  // Check if cash register is open for selected location
  useEffect(() => {
    let isMounted = true;

    const checkCashRegister = async () => {
      if (!selectedLocation?.id) {
        if (isMounted) {
          setIsCashRegisterOpen(null);
        }
        return;
      }

      try {
        if (isMounted) {
          setIsCheckingCash(true);
        }
        const response = await apiClient.get(`/cash-in-hand/current-balance/${selectedLocation.id}`);
        const cashInHand = response.data?.cashInHand;

        if (!isMounted) return;

        if (cashInHand) {
          // Check if record is for today and status is OPEN
          const today = new Date();
          const recordDate = new Date(cashInHand.date);
          today.setHours(0, 0, 0, 0);
          recordDate.setHours(0, 0, 0, 0);

          const isToday = recordDate.getTime() === today.getTime();
          setIsCashRegisterOpen(isToday && cashInHand.status === 'OPEN');
        } else {
          setIsCashRegisterOpen(false);
        }
      } catch (error: any) {
        if (!isMounted) return;

        // 404 means no cash in hand record exists (not opened)
        if (error.response?.status === 404) {
          setIsCashRegisterOpen(false);
        } else {
          console.error('Error checking cash register:', error);
          // Default to false to show warning
          setIsCashRegisterOpen(false);
        }
      } finally {
        if (isMounted) {
          setIsCheckingCash(false);
        }
      }
    };

    checkCashRegister();

    return () => {
      isMounted = false;
    };
  }, [selectedLocation?.id]);

  // Load products when location changes
  useEffect(() => {
    if (selectedLocation?.id) {
      loadProducts(selectedLocation.id);
    }
  }, [selectedLocation?.id, loadProducts]);

  // Initialize displayed products
  useEffect(() => {
    if (filteredProducts.length > 0) {
      const initialProducts = filteredProducts.slice(0, PRODUCTS_PER_PAGE);
      setDisplayedProducts(initialProducts);
      setCurrentPage(1);
    }
  }, [filteredProducts]);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear search timeouts
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (customerSearchTimeout) {
        clearTimeout(customerSearchTimeout);
      }
      // Clear blur handler timeouts
      if (searchBlurTimeoutRef.current) {
        clearTimeout(searchBlurTimeoutRef.current);
      }
      if (customerSearchBlurTimeoutRef.current) {
        clearTimeout(customerSearchBlurTimeoutRef.current);
      }
    };
  }, [searchTimeout, customerSearchTimeout]);

  // Search functionality
  const handleSearchInput = (value: string) => {
    setSearchTerm(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      performSearch(value);
    }, 300);

    setSearchTimeout(timeout);
  };

  const performSearch = async (searchTerm: string) => {
    if (!selectedLocation || searchTerm.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      setSelectedSearchIndex(-1);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchProducts(searchTerm);

      // Check if component is still mounted before updating state
      // (This check is implicit - if the component unmounts, React will handle it,
      // but we ensure we don't set state unnecessarily)

      if (!Array.isArray(results)) {
        setSearchResults([]);
        setShowSearchDropdown(false);
        return;
      }

      const productsWithStock = results.filter(product => {
        const stock = getProductStockQuantity(product);
        return stock > 0;
      });

      setSearchResults(productsWithStock);
      if (productsWithStock.length > 0) {
        setShowSearchDropdown(true);
        setSelectedSearchIndex(0);
      } else {
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
      }
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
      setShowSearchDropdown(false);
      setSelectedSearchIndex(-1);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    addToCart(product, getProductStockQuantity);
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchDropdown(false);
    setSelectedSearchIndex(-1);
  };

  const handleSearchFocus = () => {
    if (searchResults.length > 0) {
      setShowSearchDropdown(true);
    }
  };

  const handleSearchBlur = () => {
    // Clear any existing blur timeout
    if (searchBlurTimeoutRef.current) {
      clearTimeout(searchBlurTimeoutRef.current);
    }

    // Set new timeout and store reference
    searchBlurTimeoutRef.current = setTimeout(() => {
      setShowSearchDropdown(false);
      searchBlurTimeoutRef.current = null;
    }, 200);
  };

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
        if (searchResults.length === 0) {
          return;
        }
        let targetIndex = selectedSearchIndex;
        if (targetIndex < 0) {
          targetIndex = 0;
        } else if (targetIndex >= searchResults.length) {
          targetIndex = searchResults.length - 1;
        }
        setSelectedSearchIndex(targetIndex);
        handleProductSelect(searchResults[targetIndex]);
        break;
      case 'Escape':
        setShowSearchDropdown(false);
        setSelectedSearchIndex(-1);
        break;
    }
  };

  // Customer search functionality
  const handleCustomerSearchInput = (value: string) => {
    setCustomerSearchTerm(value);

    if (customerSearchTimeout) {
      clearTimeout(customerSearchTimeout);
    }

    const timeout = setTimeout(() => {
      performCustomerSearch(value);
    }, 300);

    setCustomerSearchTimeout(timeout);
  };

  const performCustomerSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setCustomerSearchResults([]);
      setShowCustomerSearchDropdown(false);
      return;
    }

    setCustomerSearchLoading(true);
    try {
      const results = await searchCustomers(searchTerm);

      // Check if component is still mounted before updating state
      // (This check is implicit - if the component unmounts, React will handle it,
      // but we ensure we don't set state unnecessarily)

      if (!Array.isArray(results)) {
        setCustomerSearchResults([]);
        setShowCustomerSearchDropdown(false);
        return;
      }

      setCustomerSearchResults(results);
      setShowCustomerSearchDropdown(results.length > 0);
    } catch (error) {
      console.error('Error searching customers:', error);
      setCustomerSearchResults([]);
      setShowCustomerSearchDropdown(false);
    } finally {
      setCustomerSearchLoading(false);
    }
  };

  const handleCustomerSelectFromSearch = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
    setShowCustomerSearchDropdown(false);
    setSelectedCustomerSearchIndex(-1);
  };

  const handleCustomerSearchFocus = () => {
    if (customerSearchResults.length > 0) {
      setShowCustomerSearchDropdown(true);
    }
  };

  const handleCustomerSearchBlur = () => {
    // Clear any existing blur timeout
    if (customerSearchBlurTimeoutRef.current) {
      clearTimeout(customerSearchBlurTimeoutRef.current);
    }

    // Set new timeout and store reference
    customerSearchBlurTimeoutRef.current = setTimeout(() => {
      setShowCustomerSearchDropdown(false);
      customerSearchBlurTimeoutRef.current = null;
    }, 200);
  };

  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!showCustomerSearchDropdown || customerSearchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedCustomerSearchIndex(prev =>
          prev < customerSearchResults.length - 1 ? prev + 1 : -1
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedCustomerSearchIndex(prev =>
          prev > -1 ? prev - 1 : customerSearchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedCustomerSearchIndex >= 0 && selectedCustomerSearchIndex < customerSearchResults.length) {
          handleCustomerSelectFromSearch(customerSearchResults[selectedCustomerSearchIndex]);
        } else if (selectedCustomerSearchIndex === -1) {
          // Select walk-in customer
          handleCustomerSelectFromSearch(null);
        }
        break;
      case 'Escape':
        setShowCustomerSearchDropdown(false);
        setSelectedCustomerSearchIndex(-1);
        break;
    }
  };

  // Broker search functionality
  const handleBrokerSearchInput = (value: string) => {
    setBrokerSearchTerm(value);
    performBrokerSearch(value);
  };

  const performBrokerSearch = async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setBrokerSearchResults([]);
      setShowBrokerSearchDropdown(false);
      return;
    }

    setBrokerSearchLoading(true);
    try {
      const response = await apiClient.get('/brokers', { params: { search: searchTerm } });
      const results = response.data.data;
      setBrokerSearchResults(results || []);
      setShowBrokerSearchDropdown((results || []).length > 0);
    } catch (error) {
      console.error('Error searching brokers:', error);
      setBrokerSearchResults([]);
      setShowBrokerSearchDropdown(false);
    } finally {
      setBrokerSearchLoading(false);
    }
  };

  const handleBrokerSelect = (broker: any | null) => {
    setSelectedBroker(broker);
    setBrokerSearchTerm('');
    setBrokerSearchResults([]);
    setShowBrokerSearchDropdown(false);
  };

  const handleBrokerSearchBlur = () => {
    brokerSearchBlurTimeoutRef.current = setTimeout(() => {
      setShowBrokerSearchDropdown(false);
    }, 200);
  };

  const handleBrokerSearchFocus = () => {
    if (brokerSearchResults.length > 0) {
      setShowBrokerSearchDropdown(true);
    }
  };

  // Product list pagination
  const loadMoreProducts = () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const startIndex = currentPage * PRODUCTS_PER_PAGE;
    const endIndex = startIndex + PRODUCTS_PER_PAGE;
    const newProducts = filteredProducts.slice(startIndex, endIndex);

    setDisplayedProducts(prev => [...prev, ...newProducts]);
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  };

  // Cart quantity editing
  const handleQuantityEdit = (itemId: string, value: string) => {
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleQuantityEditFocus = (itemId: string, value: string) => {
    setEditingQuantities(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleQuantityEditBlur = (itemId: string, value: string) => {
    const inputValue = editingQuantities[itemId];
    if (inputValue !== undefined) {
      const newQuantity = parseInt(inputValue) || 1;
      if (newQuantity >= 1) {
        const cartItem = cartItems.find(item => item.id === itemId);
        if (cartItem && cartItem.productId) {
          const product = products.find(p => p.id === cartItem.productId);
          if (product) {
            const currentStock = getProductStockQuantity(product);
            if (newQuantity > currentStock) {
              // Reset to current quantity
              setEditingQuantities(prev => ({
                ...prev,
                [itemId]: cartItem.quantity.toString()
              }));
              return;
            }
          }
        }
        updateQuantity(itemId, newQuantity, getProductStockQuantity, products);
      }
      setEditingQuantities(prev => {
        const newState = { ...prev };
        delete newState[itemId];
        return newState;
      });
    }
  };

  const handleQuantityEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, itemId: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Service form
  const handleAddService = (serviceData: any) => {
    addServiceToCart(serviceData);
  };

  // Customer form
  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
  };

  // Bilty form
  const handleBiltyDataChange = (data: BiltyFormData) => {
    setBiltyData(data);
  };

  // Payment
  const handleCompleteSale = () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before completing sale');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async (paymentData: any) => {
    try {
      console.log('handleProcessPayment called with taxRate:', taxRate);
      await processPayment(
        cartItems,
        selectedCustomer,
        selectedLocation,
        paymentData.method,
        paymentData.amount,
        paymentData.notes,
        taxRate, // Use taxRate state instead of hardcoded 15.0
        discount,
        subtotal,
        itemDiscounts,
        saleDiscount,
        subtotalAfterDiscount,
        taxAmount,
        totalAmount,
        changeGiven,
        paymentData.isCreditSale,
        selectedBroker
      );

      // Clear cart and reset form
      clearCart();
      setSelectedCustomer(null);
      setSelectedBroker(null);
      setAmountPaid(0);
      setChangeGiven(0);
      setSaleNotes('');
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Payment processing failed:', error);
    }
  };

  // Receipt actions
  const handleDownloadReceipt = async (receiptId: string) => {
    await downloadReceipt(receiptId);
  };

  const handlePrintReceipt = async (receiptId: string) => {
    await printReceipt(receiptId);
  };

  const handleGenerateReceipt = async (saleId: string) => {
    try {
      await generateReceipt(saleId);
    } catch (error) {
      console.error('Receipt generation failed:', error);
    }
  };

  // Hold Invoice handlers
  const handleHoldInvoice = async (data: { name?: string; notes?: string }) => {
    if (!selectedLocation?.id) {
      toast.error('Please select a location');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Cannot hold an empty invoice');
      return;
    }

    try {
      // Map cart items to the format expected by the backend
      // Only send the fields that the backend expects, not the calculated frontend-only fields
      const mappedItems = cartItems.map(item => ({
        productId: item.productId,
        itemType: item.itemType,
        itemName: item.itemName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemDiscountAmount: item.itemDiscountAmount || 0,
        itemTaxAmount: item.itemTaxAmount || 0,
      })) as any; // Cast to any since backend DTO has different structure than CartItem

      await holdInvoice({
        locationId: selectedLocation.id,
        customerId: selectedCustomer?.id,
        brokerId: selectedBroker?.id,
        name: data.name || undefined,
        items: mappedItems,
        subtotal,
        taxRate,
        taxAmount,
        discountType: discount.type || undefined,
        discountValue: discount.value || undefined,
        discountAmount: saleDiscount || 0,
        totalAmount,
        biltyAddress: biltyData.address || undefined,
        biltyContact: biltyData.contact || undefined,
        labourExpense: biltyData.labourExpense || undefined,
        freightCharges: biltyData.freightCharges || undefined,
        notes: data.notes || undefined,
      });

      // Clear cart after holding
      clearCart();
      setSelectedCustomer(null);
      setBiltyData({
        address: '',
        contact: '',
        labour: undefined,
        freightCharges: 0,
        labourExpense: 0
      });
    } catch (error) {
      console.error('Failed to hold invoice:', error);
    }
  };

  const handleRestoreHeldInvoice = (heldInvoice: HeldInvoice) => {
    try {
      // Map held invoice items to CartItem format
      // Calculate missing fields (lineSubtotal, lineTotal, id)
      const restoredItems = heldInvoice.items.map((item: any, index: number) => {
        const unitPrice = Number(item.unitPrice) || 0;
        const quantity = Number(item.quantity) || 0;
        const itemDiscountAmount = Number(item.itemDiscountAmount) || 0;
        const itemTaxAmount = Number(item.itemTaxAmount) || 0;

        // Calculate lineSubtotal (quantity * unitPrice)
        const lineSubtotal = unitPrice * quantity;

        // Calculate lineTotal (lineSubtotal - discount + tax)
        const lineTotal = lineSubtotal - itemDiscountAmount + itemTaxAmount;

        return {
          id: item.id || `restored_${Date.now()}_${index}`,
          productId: item.productId,
          itemType: item.itemType,
          itemName: item.itemName,
          sku: item.sku,
          barcode: item.barcode,
          quantity: quantity,
          unitPrice: unitPrice,
          lineSubtotal: lineSubtotal,
          itemTaxAmount: itemTaxAmount,
          itemDiscountAmount: itemDiscountAmount,
          lineTotal: lineTotal,
        };
      });

      // Restore items to cart
      setCartItems(restoredItems);

      // Restore customer if available
      if (heldInvoice.customer) {
        setSelectedCustomer(heldInvoice.customer);
        setSalespersonType('CUSTOMER');
      } else if (heldInvoice.broker) {
        setSelectedBroker(heldInvoice.broker);
        setSalespersonType('BROKER');
      }

      // Restore discount
      setDiscount({
        type: (heldInvoice.discountType as any) || 'PERCENTAGE',
        value: Number(heldInvoice.discountValue || 0),
        amount: Number(heldInvoice.discountAmount || 0),
      });

      // Restore tax rate
      setTaxRate(Number(heldInvoice.taxRate || 0));

      // Restore bilty data
      if (heldInvoice.biltyAddress || heldInvoice.biltyContact) {
        setBiltyData({
          address: heldInvoice.biltyAddress || '',
          contact: heldInvoice.biltyContact || '',
          labour: undefined,
          freightCharges: heldInvoice.freightCharges || 0,
          labourExpense: heldInvoice.labourExpense || 0,
        });
      }

      toast.success('Invoice restored to cart!');
    } catch (error) {
      console.error('Failed to restore invoice:', error);
      toast.error('Failed to restore invoice');
    }
  };

  // Generate invoice data from current cart state
  const generateInvoiceData = (): InvoiceData | null => {
    if (!selectedLocation || cartItems.length === 0) {
      return null;
    }

    // Generate invoice number (timestamp-based for draft)
    const invoiceNumber = `DRAFT-${Date.now()}`;
    const existingBalance = selectedCustomer ? Number(selectedCustomer.balance ?? 0) : undefined;
    const projectedBalanceAfterInvoice =
      existingBalance !== undefined ? existingBalance + totalAmount : undefined;

    return {
      location: selectedLocation,
      invoiceNumber,
      date: new Date(),
      customer: selectedCustomer,
      broker: selectedBroker,
      customerBalanceDue: existingBalance,
      projectedBalanceAfterInvoice,
      biltyAddress: biltyData.address || undefined,
      biltyContact: biltyData.contact || undefined,
      items: cartItems,
      subtotal,
      itemDiscounts,
      saleDiscount: discount, // Use the discount object, not the saleDiscount number
      additionalCharges: {
        labourExpense: biltyData.labourExpense || 0,
        freightCharges: biltyData.freightCharges || 0,
      },
      taxRate,
      taxAmount,
      totalAmount,
      notes: saleNotes || undefined,
    };
  };

  // Handle view invoice
  const handleViewInvoice = () => {
    if (cartItems.length === 0) {
      toast.error('Please add items to cart before viewing invoice');
      return;
    }
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }
    setShowInvoicePreviewModal(true);
  };

  // Handle save invoice (save as held invoice)
  const handleSaveInvoice = async () => {
    if (!selectedLocation?.id) {
      toast.error('Please select a location');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Cannot save an empty invoice');
      return;
    }

    setIsSavingInvoice(true);
    try {
      // Map cart items to the format expected by the backend
      const mappedItems = cartItems.map(item => ({
        productId: item.productId,
        itemType: item.itemType,
        itemName: item.itemName,
        sku: item.sku,
        barcode: item.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        itemDiscountAmount: item.itemDiscountAmount || 0,
        itemTaxAmount: item.itemTaxAmount || 0,
      })) as any;

      await holdInvoice({
        locationId: selectedLocation.id,
        customerId: selectedCustomer?.id,
        name: `Draft Invoice - ${new Date().toLocaleString()}`,
        items: mappedItems,
        subtotal,
        taxRate,
        taxAmount,
        discountType: discount.type || undefined,
        discountValue: discount.value || undefined,
        discountAmount: saleDiscount || 0,
        totalAmount,
        biltyAddress: biltyData.address || undefined,
        biltyContact: biltyData.contact || undefined,
        labourExpense: biltyData.labourExpense || undefined,
        freightCharges: biltyData.freightCharges || undefined,
        notes: saleNotes || undefined,
      });

      toast.success('Invoice saved successfully!');
      setShowInvoicePreviewModal(false);
    } catch (error: any) {
      console.error('Failed to save invoice:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save invoice';
      toast.error(Array.isArray(errorMessage) ? errorMessage[0] : errorMessage);
    } finally {
      setIsSavingInvoice(false);
    }
  };

  return (
    <div className="relative min-h-screen pos-theme">
      <POSHeader
        selectedLocation={selectedLocation}
        onLocationSwitch={onLocationSwitch}
        onNavigateToDashboard={onNavigateToDashboard}
        onHoldInvoice={() => {
          console.log('Hold Invoice clicked, opening modal');
          setShowHoldInvoiceModal(true);
        }}
        onViewHeldInvoices={() => {
          console.log('View Held Invoices clicked, opening modal');
          setShowHeldInvoicesListModal(true);
        }}
        onViewInvoice={handleViewInvoice}
      />
      <main className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        {/* Cash Register Warning Banner */}
        {selectedLocation && isCashRegisterOpen === false && showCashWarning && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-100 to-rose-50 px-5 py-4 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-white/80 border border-amber-100 flex items-center justify-center shadow">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 text-sm">
                <h3 className="font-semibold text-amber-900 mb-1 tracking-wide uppercase text-sm">
                  Cash register not opened
                </h3>
                <p className="text-amber-800 leading-snug text-sm">
                  The cash register hasn&apos;t been opened today at <strong>{selectedLocation.name}</strong>.
                  Sales are still allowed and will be tracked, and the opening balance will be adjusted automatically once the register is opened.
                </p>
              </div>
              <button
                onClick={() => setShowCashWarning(false)}
                className="ml-2 text-amber-500 hover:text-amber-600 transition-colors flex-shrink-0"
                aria-label="Dismiss warning"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isCompletingSale && (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-40">
            <div className="bg-white/90 backdrop-blur rounded-2xl p-6 shadow-2xl border border-slate-100 max-w-sm w-full mx-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Processing sale</h3>
                  <p className="text-xs text-slate-600">
                    Please wait while we complete your sale...
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {/* Left Panel - Product Search */}
          <section className="lg:col-span-4 flex flex-col gap-3">
            {/* Product Search Card */}
            <Card className="bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-200 shadow-lg rounded-2xl hover:border-emerald-300 hover:shadow-xl transition-all">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-slate-900">
                  Search product by name / barcode
                </h3>
                <ProductSearch
                  searchTerm={searchTerm}
                  onSearchChange={handleSearchInput}
                  onProductSelect={handleProductSelect}
                  searchResults={searchResults}
                  showDropdown={showSearchDropdown}
                  searchLoading={searchLoading}
                  selectedIndex={selectedSearchIndex}
                  onSearchFocus={handleSearchFocus}
                  onSearchBlur={handleSearchBlur}
                  onSearchKeyDown={handleSearchKeyDown}
                  getProductStockQuantity={getProductStockQuantity}
                />
                <ServiceForm onAddService={handleAddService} />
              </CardContent>
            </Card>

            {/* Product List */}
            <Card className="bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-200 shadow-lg rounded-2xl hover:border-emerald-300 hover:shadow-xl transition-all">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-slate-900">Available products</h3>
                <ProductList
                  products={filteredProducts}
                  displayedProducts={displayedProducts}
                  onAddToCart={(product) => addToCart(product, getProductStockQuantity)}
                  getProductStockQuantity={getProductStockQuantity}
                  canAddProductToCart={canAddProductToCart}
                  onLoadMore={loadMoreProducts}
                  isLoadingMore={isLoadingMore}
                  hasMoreProducts={displayedProducts.length < filteredProducts.length}
                />
              </CardContent>
            </Card>
          </section>

          {/* Middle Panel - Customer and Bilty Address Cards */}
          <section className="lg:col-span-3 flex flex-col gap-3">
            {/* Client (Customer/Broker) Selection Card */}
            <Card className="bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-200 shadow-lg rounded-2xl hover:border-emerald-300 hover:shadow-xl transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {salespersonType === 'CUSTOMER' ? 'Customer' : 'Broker'}
                  </h3>
                  <Select
                    value={salespersonType}
                    onValueChange={(value: 'CUSTOMER' | 'BROKER') => {
                      setSalespersonType(value);
                      if (value === 'CUSTOMER') setSelectedBroker(null);
                      else setSelectedCustomer(null);
                    }}
                  >
                    <SelectTrigger className="w-[120px] h-8 text-[11px] bg-white/50 border-emerald-100 rounded-lg">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CUSTOMER">Customer Sale</SelectItem>
                      <SelectItem value="BROKER">Broker Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {salespersonType === 'CUSTOMER' ? (
                  <CustomerForm
                    customers={customers}
                    selectedCustomer={selectedCustomer}
                    onCustomerSelect={handleCustomerSelect}
                    onCreateCustomer={createCustomer}
                    customerSearchTerm={customerSearchTerm}
                    onCustomerSearchChange={handleCustomerSearchInput}
                    customerSearchResults={customerSearchResults}
                    showCustomerSearchDropdown={showCustomerSearchDropdown}
                    customerSearchLoading={customerSearchLoading}
                    selectedCustomerSearchIndex={selectedCustomerSearchIndex}
                    onCustomerSearchFocus={handleCustomerSearchFocus}
                    onCustomerSearchBlur={handleCustomerSearchBlur}
                    onCustomerSearchKeyDown={handleCustomerSearchKeyDown}
                  />
                ) : (
                  <BrokerForm
                    onBrokerSelect={handleBrokerSelect}
                    selectedBroker={selectedBroker}
                    searchTerm={brokerSearchTerm}
                    onSearchChange={handleBrokerSearchInput}
                    searchResults={brokerSearchResults}
                    showDropdown={showBrokerSearchDropdown}
                    isLoading={brokerSearchLoading}
                    onSearchFocus={handleBrokerSearchFocus}
                    onSearchBlur={handleBrokerSearchBlur}
                  />
                )}
              </CardContent>
            </Card>

            {/* Bilty Address Card */}
            <Card className="bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-200 shadow-lg rounded-2xl hover:border-emerald-300 hover:shadow-xl transition-all">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-slate-900">Bilty address</h3>
                <BiltyForm onDataChange={handleBiltyDataChange} />
              </CardContent>
            </Card>
          </section>

          {/* Right Panel - Item List & Order Summary */}
          <section className="lg:col-span-5 flex flex-col">
            <Card className="flex-1 bg-gradient-to-br from-emerald-50 via-white to-sky-50 border border-emerald-200 shadow-lg rounded-2xl hover:border-emerald-300 hover:shadow-xl transition-all">
              <CardContent className="p-4 flex flex-col gap-4 h-full">
                {/* Item List */}
                <div className="flex-1 min-h-[12rem]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900">Item list</h3>
                    {cartItems.length > 0 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {cartItems.length} item{cartItems.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <CartItems
                    cartItems={cartItems}
                    onUpdateQuantity={(itemId, newQuantity) =>
                      updateQuantity(itemId, newQuantity, getProductStockQuantity, products)
                    }
                    onRemoveItem={removeFromCart}
                    editingQuantities={editingQuantities}
                    onQuantityEdit={handleQuantityEdit}
                    onQuantityEditFocus={handleQuantityEditFocus}
                    onQuantityEditBlur={handleQuantityEditBlur}
                    onQuantityEditKeyDown={handleQuantityEditKeyDown}
                    getProductStockQuantity={getProductStockQuantity}
                    products={products}
                    onUpdateUnitPrice={updateUnitPrice}
                    onUpdateItemDiscount={updateItemDiscount}
                  />
                </div>

                {/* Order Summary */}
                <div className="border-t border-slate-100 pt-3">
                  <h3 className="text-sm font-semibold mb-3 text-slate-900">Order summary</h3>
                  <OrderSummary
                    subtotal={subtotal}
                    discount={discount}
                    onDiscountChange={setDiscount}
                    totalAmount={totalAmount}
                    taxAmount={taxAmount}
                    taxRate={taxRate}
                    onTaxRateChange={setTaxRate}
                    onCompleteSale={handleCompleteSale}
                    isCompletingSale={isCompletingSale}
                    cartItemsCount={cartItems.length}
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onProcessPayment={handleProcessPayment}
          totalAmount={totalAmount}
          isProcessing={isCompletingSale}
          selectedCustomer={selectedCustomer}
          selectedBroker={selectedBroker}
        />

        {/* Receipt Preview Modal */}
        <ReceiptPreviewModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          completedSale={completedSale}
          receiptData={receiptData}
          receiptCartItems={receiptCartItems}
          receiptTotals={receiptTotals}
          paymentMethod={paymentMethod}
          saleNotes={saleNotes}
          onDownloadReceipt={handleDownloadReceipt}
          onPrintReceipt={handlePrintReceipt}
          onGenerateReceipt={handleGenerateReceipt}
        />

        {/* Hold Invoice Modal */}
        <HoldInvoiceModal
          isOpen={showHoldInvoiceModal}
          onClose={() => {
            console.log('Closing Hold Invoice modal');
            setShowHoldInvoiceModal(false);
          }}
          onConfirm={handleHoldInvoice}
          cartItemsCount={cartItems.length}
          totalAmount={totalAmount}
        />

        {/* Held Invoices List Modal */}
        <HeldInvoicesListModal
          isOpen={showHeldInvoicesListModal}
          onClose={() => setShowHeldInvoicesListModal(false)}
          locationId={selectedLocation?.id}
          onRestore={handleRestoreHeldInvoice}
        />

        {/* Invoice Preview Modal */}
        <InvoicePreviewModal
          isOpen={showInvoicePreviewModal}
          onClose={() => setShowInvoicePreviewModal(false)}
          invoiceData={generateInvoiceData()}
          onSaveInvoice={handleSaveInvoice}
          isSaving={isSavingInvoice}
        />
      </main>
    </div>
  );
}
