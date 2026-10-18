'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useSale, useUpdateSale, UpdateSaleDto } from '@/hooks/pos/useSaleMutations';
import { useCustomers, Customer } from '@/hooks/pos/useCustomers';
import { useLocations, Location } from '@/hooks/pos/useLocations';
import { useProducts } from '@/hooks/pos/useProducts';
import { useCart, CartItem } from '@/hooks/pos/useCart';
import { formatCurrency } from '@/lib/currency';
import { apiClient } from '@/lib/api-client';
import ProductSearch from '@/components/pos/ProductSearch';
import ServiceForm from '@/components/pos/ServiceForm';
import CartItems from '@/components/pos/CartItems';
import OrderSummary from '@/components/pos/OrderSummary';
import CustomerForm from '@/components/pos/CustomerForm';
import PaymentModal from '@/components/pos/PaymentModal';

export default function EditSalePage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id as string;

  // Hooks
  const { data: sale, isLoading: saleLoading, error: saleError } = useSale(saleId);
  const updateSaleMutation = useUpdateSale();
  const { customers, selectedCustomer, setSelectedCustomer, searchCustomers } = useCustomers();
  const { locations, selectedLocation, setSelectedLocation } = useLocations();
  const { products, searchProducts, getProductStockQuantity, canAddProductToCart } = useProducts(selectedLocation?.id);
  const {
    cartItems,
    setCartItems,
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
    addServiceToCart,
  } = useCart(0);

  // State
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [changeReason, setChangeReason] = useState('');
  const [notes, setNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [saleType, setSaleType] = useState<'RETAIL' | 'SERVICE'>('RETAIL');
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [payments, setPayments] = useState<Array<{
    paymentMethod: 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER';
    amount: number;
    referenceNumber?: string;
    cardLastFour?: string;
    cardType?: string;
    bankName?: string;
    chequeNumber?: string;
    notes?: string;
  }>>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountNotes, setDiscountNotes] = useState('');
  const [isAddingDiscount, setIsAddingDiscount] = useState(false);
  const [editingQuantities, setEditingQuantities] = useState<{[key: string]: string}>({});
  const [hasLoadedSale, setHasLoadedSale] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);

  // Load sale data and populate form
  useEffect(() => {
    if (sale && !hasLoadedSale) {
      // Set basic info
      setSaleType(sale.saleType || 'RETAIL');
      setNotes(sale.notes || '');
      setCustomerNotes(sale.customerNotes || '');
      setIsCreditSale(sale.status === 'CREDIT' || sale.isCreditSale || false);
      setTaxRate(sale.taxRate || 0);

      // Set discount
      if (sale.discountType && sale.discountValue !== undefined) {
        const discountAmount = sale.discountAmount || 0;
        setDiscount({
          type: sale.discountType,
          value: sale.discountValue,
          amount: discountAmount,
        });
      }

      // Set location
      if (sale.location) {
        setSelectedLocation(sale.location);
      }

      // Set customer
      if (sale.customer) {
        setSelectedCustomer(sale.customer);
      }

      // Convert sale items to cart items
      // Store original item data for discount type preservation
      const cartItemsFromSale: CartItem[] = sale.saleItems?.map((item: any) => ({
        id: `item_${item.id}`,
        productId: item.productId,
        itemType: item.itemType,
        itemName: item.itemName,
        itemDescription: item.itemDescription,
        sku: item.sku,
        barcode: item.barcode,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        lineSubtotal: Number(item.lineSubtotal || item.quantity * item.unitPrice),
        itemTaxAmount: Number(item.itemTaxAmount || 0),
        itemDiscountAmount: Number(item.itemDiscountAmount || 0),
        lineTotal: Number(item.lineTotal || item.lineSubtotal),
        // Store original discount type if available (for later use)
        originalItemDiscountType: item.itemDiscountType,
      })) || [];
      setCartItems(cartItemsFromSale);

      // Set payments - include all fields that backend accepts
      if (sale.payments && sale.payments.length > 0) {
        setPayments(sale.payments.map((p: any) => ({
          paymentMethod: p.paymentMethod as 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER',
          amount: Number(p.amount),
          referenceNumber: p.referenceNumber || undefined,
          cardLastFour: p.cardLastFour || undefined,
          cardType: p.cardType || undefined,
          bankName: p.bankName || undefined,
          chequeNumber: p.chequeNumber || undefined,
          notes: p.notes || undefined,
        })));
      }

      setHasLoadedSale(true);
    }
  }, [sale, hasLoadedSale]);

  // Check if sale can be edited
  // Cannot edit COMPLETED, REFUNDED, or CANCELLED sales
  // Cannot edit if sale has processed returns
  const hasProcessedReturns = sale?.returns?.some((r: any) => r.status === 'PROCESSED') || false;
  const canEdit = sale && 
    sale.status !== 'COMPLETED' &&
    sale.status !== 'REFUNDED' && 
    sale.status !== 'CANCELLED' &&
    sale.paymentStatus !== 'CANCELLED' &&
    !hasProcessedReturns;

  // Handle save with comprehensive validation
  const handleSave = async () => {
    // Validation: Check if sale exists and can be edited
    if (!sale || !canEdit) {
      toast.error('This sale cannot be edited');
      return;
    }

    // Validation: Location is required
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    // Validation: At least one item required
    if (cartItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validation: Change reason is required
    if (!changeReason.trim()) {
      toast.error('Please provide a reason for the change');
      return;
    }

    // Validation: Validate all cart items
    const itemErrors: string[] = [];
    cartItems.forEach((item, index) => {
      if (!item.itemName || !item.itemName.trim()) {
        itemErrors.push(`Item ${index + 1}: Name is required`);
      }
      if (item.quantity <= 0) {
        itemErrors.push(`Item ${index + 1} (${item.itemName}): Quantity must be greater than 0`);
      }
      if (item.unitPrice < 0) {
        itemErrors.push(`Item ${index + 1} (${item.itemName}): Unit price cannot be negative`);
      }
      if (item.itemType === 'PRODUCT' && !item.productId) {
        itemErrors.push(`Item ${index + 1} (${item.itemName}): Product ID is required for product items`);
      }
    });

    if (itemErrors.length > 0) {
      toast.error(`Validation errors:\n${itemErrors.join('\n')}`, { duration: 5000 });
      return;
    }

    // Validation: Tax rate must be a valid number between 0 and 100
    const numTaxRate = taxRate !== undefined && taxRate !== null ? Number(taxRate) : 0;
    if (isNaN(numTaxRate) || numTaxRate < 0 || numTaxRate > 100) {
      toast.error('Tax rate must be a valid number between 0 and 100');
      return;
    }

    // Validation: Discount value must be non-negative
    if (discount.value < 0) {
      toast.error('Discount value cannot be negative');
      return;
    }

    // Validation: Total amount must be positive
    if (totalAmount <= 0) {
      toast.error('Total amount must be greater than 0');
      return;
    }

    // Validation: Payment amounts validation
    // Allow negative amounts for refunds/returns, but validate they're reasonable
    const invalidPayments = payments.filter(p => {
      // Allow negative amounts (refunds/returns) but ensure they're not unreasonably large
      // Positive payments should be >= 0
      // Negative payments (refunds) should be reasonable (not more than the total amount)
      if (p.amount >= 0) {
        return false; // Valid positive payment
      }
      // Negative payment (refund) - check if it's reasonable
      // A refund shouldn't exceed the total amount in absolute value
      return Math.abs(p.amount) > totalAmount * 2; // Allow refunds up to 2x total (safety check)
    });
    if (invalidPayments.length > 0) {
      toast.error('One or more payment amounts are invalid. Refunds cannot exceed reasonable limits.');
      return;
    }

    setIsSaving(true);
    try {
      // Prepare update data with validation
      const updateData: UpdateSaleDto = {
        saleType,
        locationId: selectedLocation.id,
        customerId: selectedCustomer?.id,
        items: cartItems.map(item => {
          // Use the validated tax rate from above (numTaxRate is already validated)
          // Only include itemTaxRate if it's a valid number between 0 and 100
          const validItemTaxRate = (numTaxRate >= 0 && numTaxRate <= 100) ? numTaxRate : undefined;
          
          return {
            productId: item.productId,
            itemType: item.itemType,
            itemName: item.itemName,
            itemDescription: item.itemDescription,
            sku: item.sku,
            barcode: item.barcode,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: 0, // Will be inferred from product
            itemTaxRate: validItemTaxRate, // Only include if valid, otherwise undefined
            // Preserve original discount type if available, otherwise default to FIXED if amount > 0
            itemDiscountType: item.originalItemDiscountType || (item.itemDiscountAmount > 0 ? 'FIXED' : 'PERCENTAGE'),
            itemDiscountRate: item.itemDiscountAmount > 0 ? item.itemDiscountAmount : 0,
            notes: undefined,
          };
        }),
        payments: payments.length > 0 ? payments : undefined,
        taxRate: numTaxRate, // Use validated tax rate
        discountType: discount.type,
        discountValue: discount.value,
        notes,
        customerNotes,
        isCreditSale,
        totalAmount,
        changeReason,
      };

      await updateSaleMutation.mutateAsync({ id: saleId, data: updateData });
      
      // Redirect to sale details
      router.push(`/dashboard/pos/history`);
    } catch (error: any) {
      console.error('Error updating sale:', error);
      
      // Enhanced error handling with user-friendly messages
      let errorMessage = 'Failed to update sale';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show detailed error if available
      if (error.response?.data?.details) {
        const details = error.response.data.details;
        if (Array.isArray(details)) {
          errorMessage = details.join(', ');
        } else if (typeof details === 'string') {
          errorMessage = details;
        }
      }
      
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setIsSaving(false);
      setShowConfirmDialog(false);
    }
  };

  // Handle payment processing
  const handleProcessPayment = async (paymentData: {
    method: string;
    amount: number;
    notes: string;
    isCreditSale?: boolean;
  }) => {
    setPayments([{
      paymentMethod: paymentData.method as 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER',
      amount: paymentData.amount,
      notes: paymentData.notes,
    }]);
    setIsCreditSale(paymentData.isCreditSale || false);
    setShowPaymentModal(false);
  };

  // Handle discount adjustment (negative payment)
  const handleAddDiscountAdjustment = async () => {
    if (discountAmount <= 0) {
      toast.error('Discount amount must be greater than 0');
      return;
    }

    if (!sale) {
      toast.error('Sale not found');
      return;
    }

    setIsAddingDiscount(true);
    try {
      // Add negative payment as discount adjustment
      await apiClient.post(`/pos/sales/${saleId}/payments`, {
        amount: -discountAmount, // Negative amount for discount
        paymentMethod: 'OTHER',
        notes: discountNotes || `Discount adjustment: ${formatCurrency(discountAmount)}`,
      });

      toast.success(`Discount of ${formatCurrency(discountAmount)} applied successfully`);
      setShowDiscountModal(false);
      setDiscountAmount(0);
      setDiscountNotes('');
      
      // Reload sale data to reflect the change
      window.location.reload(); // Simple refresh to get updated data
    } catch (error: any) {
      console.error('Error adding discount adjustment:', error);
      toast.error(error.response?.data?.message || 'Error applying discount adjustment');
    } finally {
      setIsAddingDiscount(false);
    }
  };

  if (saleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading sale data...</p>
        </div>
      </div>
    );
  }

  if (saleError || !sale) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">Sale not found</p>
          <p className="text-gray-300 mt-2">The sale you're looking for doesn't exist or has been deleted.</p>
          <Button onClick={() => router.push('/dashboard/pos/history')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales History
          </Button>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    // Check if sale has processed returns - show discount adjustment option
    const hasProcessedReturns = sale?.saleReturns?.some((r: any) => r.status === 'PROCESSED') || false;
    const outstandingBalance = sale ? Number(sale.totalAmount) - Number(sale.amountPaid || 0) : 0;
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-2xl">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white">Sale Cannot Be Edited</p>
          <p className="text-gray-300 mt-2">
            {sale.status === 'COMPLETED' && 'Cannot edit a completed sale. Use returns or refunds to adjust.'}
            {sale.status === 'REFUNDED' && 'This sale has been refunded and cannot be edited.'}
            {sale.status === 'CANCELLED' && 'This sale has been cancelled and cannot be edited.'}
            {sale.paymentStatus === 'CANCELLED' && 'This sale has been cancelled and cannot be edited.'}
            {hasProcessedReturns && 'This sale has processed returns and cannot be edited.'}
            {!sale.status || (sale.status !== 'COMPLETED' && sale.status !== 'REFUNDED' && sale.status !== 'CANCELLED' && sale.paymentStatus !== 'CANCELLED' && !hasProcessedReturns) && 'This sale cannot be edited in its current state.'}
          </p>
          
          {hasProcessedReturns && outstandingBalance > 0 && (
            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 mb-3">
                <strong>Alternative Solution:</strong> You can apply a discount adjustment to reduce the outstanding balance without editing the sale.
              </p>
              <Button
                onClick={() => setShowDiscountModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Apply Discount Adjustment
              </Button>
            </div>
          )}
          
          <div className="mt-4">
            <Button onClick={() => router.push('/dashboard/pos/history')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sales History
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/pos/history')}
            className="mb-4 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales History
          </Button>
          <h1 className="text-3xl font-bold text-white">Edit Sale</h1>
          <p className="text-gray-400 mt-1">Sale #{sale.saleNumber}</p>
        </div>
        <div className="flex gap-2">
          {sale && (Number(sale.totalAmount) - Number(sale.amountPaid || 0)) > 0 && (
            <Button
              onClick={() => setShowDiscountModal(true)}
              variant="outline"
              className="border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              Apply Discount
            </Button>
          )}
          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={isSaving || cartItems.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sale Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Sale Type</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={saleType} onValueChange={(value: 'RETAIL' | 'SERVICE') => setSaleType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETAIL">Retail</SelectItem>
                  <SelectItem value="SERVICE">Service</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Location Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedLocation?.id || ''}
                onValueChange={(value) => {
                  const location = locations.find(l => l.id === value);
                  if (location) setSelectedLocation(location);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomerForm
                customers={customers}
                selectedCustomer={selectedCustomer}
                onCustomerSelect={setSelectedCustomer}
                onCreateCustomer={async () => null}
                customerSearchTerm=""
                onCustomerSearchChange={() => {}}
                customerSearchResults={[]}
                showCustomerSearchDropdown={false}
                customerSearchLoading={false}
                darkMode={true}
              />
            </CardContent>
          </Card>

          {/* Product Search */}
          {saleType === 'RETAIL' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <ProductSearch
                  searchTerm={searchTerm}
                  onSearchChange={async (value) => {
                    setSearchTerm(value);
                    if (value.trim().length >= 2) {
                      setSearchLoading(true);
                      try {
                        const results = await searchProducts(value);
                        setSearchResults(results);
                        setShowSearchDropdown(true);
                      } catch (error) {
                        console.error('Search error:', error);
                        setSearchResults([]);
                      } finally {
                        setSearchLoading(false);
                      }
                    } else {
                      setSearchResults([]);
                      setShowSearchDropdown(false);
                    }
                  }}
                  onProductSelect={(product) => {
                    if (canAddProductToCart(product)) {
                      addToCart(product, getProductStockQuantity);
                      setSearchTerm('');
                      setSearchResults([]);
                      setShowSearchDropdown(false);
                    } else {
                      toast.error('Product cannot be added to cart');
                    }
                  }}
                  searchResults={searchResults}
                  showDropdown={showSearchDropdown}
                  searchLoading={searchLoading}
                  selectedIndex={selectedSearchIndex}
                  onSearchFocus={() => {
                    if (searchResults.length > 0) {
                      setShowSearchDropdown(true);
                    }
                  }}
                  onSearchBlur={() => {
                    setTimeout(() => setShowSearchDropdown(false), 200);
                  }}
                  onSearchKeyDown={(e) => {
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
                          const product = searchResults[selectedSearchIndex];
                          if (canAddProductToCart(product)) {
                            addToCart(product, getProductStockQuantity);
                            setSearchTerm('');
                            setSearchResults([]);
                            setShowSearchDropdown(false);
                          }
                        }
                        break;
                      case 'Escape':
                        setShowSearchDropdown(false);
                        setSelectedSearchIndex(-1);
                        break;
                    }
                  }}
                  getProductStockQuantity={getProductStockQuantity}
                />
              </CardContent>
            </Card>
          )}

          {/* Service Form */}
          {saleType === 'SERVICE' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Add Service</CardTitle>
              </CardHeader>
              <CardContent>
                <ServiceForm
                  onAddService={(serviceData) => {
                    addServiceToCart({
                      name: serviceData.name,
                      quantity: serviceData.quantity,
                      unitPrice: typeof serviceData.unitPrice === 'string' 
                        ? parseFloat(serviceData.unitPrice) 
                        : serviceData.unitPrice,
                    });
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Cart Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Items ({cartItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <CartItems
                cartItems={cartItems}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                editingQuantities={editingQuantities}
                onQuantityEdit={(itemId, value) => {
                  setEditingQuantities(prev => ({ ...prev, [itemId]: value }));
                }}
                onQuantityEditFocus={(itemId, value) => {
                  setEditingQuantities(prev => ({ ...prev, [itemId]: value }));
                }}
                onQuantityEditBlur={(itemId, value) => {
                  const numValue = parseFloat(value);
                  if (!isNaN(numValue) && numValue > 0) {
                    updateQuantity(itemId, numValue);
                  }
                  setEditingQuantities(prev => {
                    const newState = { ...prev };
                    delete newState[itemId];
                    return newState;
                  });
                }}
                onQuantityEditKeyDown={(e, itemId) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                getProductStockQuantity={getProductStockQuantity}
                products={products}
                onUpdateUnitPrice={updateUnitPrice}
                onUpdateItemDiscount={updateItemDiscount}
                darkMode={true}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-gray-300">Internal Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes (not visible to customer)"
                  rows={3}
                  className="mt-2 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <Label className="text-gray-300">Customer Notes</Label>
                <Textarea
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Notes visible on receipt"
                  rows={3}
                  className="mt-2 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderSummary
                subtotal={subtotal}
                discount={discount}
                onDiscountChange={setDiscount}
                totalAmount={totalAmount}
                taxAmount={taxAmount}
                taxRate={taxRate}
                onTaxRateChange={setTaxRate}
                onCompleteSale={() => setShowPaymentModal(true)}
                isCompletingSale={false}
                cartItemsCount={cartItems.length}
                darkMode={true}
                showCompleteButton={false}
              />
            </CardContent>
          </Card>

          {/* Payment Summary */}
          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments.map((payment, index) => (
                    <div key={index} className="flex justify-between text-sm text-gray-300">
                      <span className="capitalize">{payment.paymentMethod.replace('_', ' ')}</span>
                      <span className="font-medium text-white">{formatCurrency(payment.amount)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex justify-between font-semibold text-white">
                      <span>Total Paid:</span>
                      <span className="text-blue-400">{formatCurrency(payments.reduce((sum, p) => sum + p.amount, 0))}</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4 border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                  onClick={() => setShowPaymentModal(true)}
                >
                  Update Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {payments.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={cartItems.length === 0}
                >
                  Add Payment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Sale Update</DialogTitle>
            <DialogDescription className="text-gray-300">
              Please review the changes and provide a reason for updating this sale. This will be recorded in the audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Change Summary */}
            {sale && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 space-y-2">
                <h4 className="font-semibold text-blue-300">Change Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-400">Items:</span>
                    <span className="font-medium text-white">
                      {sale.saleItems?.length || 0} → {cartItems.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">Total Amount:</span>
                    <span className="font-medium text-white">
                      {formatCurrency(Number(sale.totalAmount || 0))} → {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  {sale.customer?.id !== selectedCustomer?.id && (
                    <div className="flex justify-between">
                      <span className="text-blue-400">Customer:</span>
                      <span className="font-medium text-white">
                        {sale.customer?.name || 'None'} → {selectedCustomer?.name || 'None'}
                      </span>
                    </div>
                  )}
                  {sale.locationId !== selectedLocation?.id && (
                    <div className="flex justify-between">
                      <span className="text-blue-400">Location:</span>
                      <span className="font-medium text-white">
                        {sale.location?.name || 'Unknown'} → {selectedLocation?.name || 'Unknown'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Impacts */}
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-yellow-300">Impacts of This Change</h4>
              <ul className="space-y-1 text-sm text-yellow-200 list-disc list-inside">
                <li>
                  <strong>Stock:</strong> Previous stock transactions will be reversed, and new stock transactions will be created based on updated items.
                </li>
                {sale?.customerId || selectedCustomer?.id ? (
                  <li>
                    <strong>Customer Balance:</strong> Customer balance will be adjusted based on the difference between old and new outstanding amounts.
                  </li>
                ) : null}
                {payments.some(p => p.paymentMethod === 'CASH') || sale?.payments?.some((p: any) => p.paymentMethod === 'CASH') ? (
                  <li>
                    <strong>Cash Transactions:</strong> Cash transactions will be updated to reflect the new payment amounts.
                  </li>
                ) : null}
              </ul>
            </div>

            {/* Warning */}
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-200">
                <strong>Warning:</strong> Updating this sale will reverse all previous impacts (stock, customer balance, cash transactions) and apply the new values. This action cannot be easily undone.
              </p>
            </div>

            {/* Change Reason */}
            <div>
              <Label className="text-gray-300">Change Reason *</Label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="e.g., Customer requested price adjustment, corrected item quantity..."
                rows={3}
                required
                className="mt-2 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!changeReason.trim() || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? 'Saving...' : 'Confirm Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onProcessPayment={handleProcessPayment}
        totalAmount={totalAmount}
        isProcessing={false}
        selectedCustomer={selectedCustomer}
      />

      {/* Discount Adjustment Modal */}
      <Dialog open={showDiscountModal} onOpenChange={setShowDiscountModal}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add Discount Adjustment</DialogTitle>
            <DialogDescription className="text-gray-300">
              Apply a discount to this sale. This will reduce the outstanding balance without editing the sale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-gray-300">Discount Amount (Rs.) *</Label>
              <Input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                className="mt-2 bg-gray-800/50 border-gray-600 text-white"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-gray-300">Notes (Optional)</Label>
              <Textarea
                value={discountNotes}
                onChange={(e) => setDiscountNotes(e.target.value)}
                placeholder="Reason for discount..."
                rows={3}
                className="mt-2 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500"
              />
            </div>
            {sale && (
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3">
                <div className="text-sm text-blue-300 space-y-1">
                  <div className="flex justify-between">
                    <span>Current Outstanding:</span>
                    <span className="font-medium text-white">
                      {formatCurrency(Number(sale.totalAmount) - Number(sale.amountPaid || 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>After Discount:</span>
                    <span className="font-medium text-white">
                      {formatCurrency(Math.max(0, Number(sale.totalAmount) - Number(sale.amountPaid || 0) - discountAmount))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDiscountModal(false);
                setDiscountAmount(0);
                setDiscountNotes('');
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddDiscountAdjustment}
              disabled={discountAmount <= 0 || isAddingDiscount}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isAddingDiscount ? 'Applying...' : 'Apply Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

