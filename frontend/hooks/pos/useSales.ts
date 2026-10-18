import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { CartItem } from './useCart';
import { Customer } from './useCustomers';
import { Location } from './useLocations';

export interface SaleData {
  saleType: string;
  customerId?: string;
  locationId: string;
  items: any[];
  payments: any[];
  taxRate: number;
  discountType: string;
  discountValue: number;
  notes: string;
  isCreditSale?: boolean;
  amountPaid?: number;
  totalAmount?: number;
}

export const useSales = () => {
  const [isCompletingSale, setIsCompletingSale] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [receiptCartItems, setReceiptCartItems] = useState<CartItem[]>([]);
  const [receiptTotals, setReceiptTotals] = useState<any>(null);

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Safe state setter that checks if component is mounted
  const safeSetState = <T,>(setter: (value: T) => void, value: T) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  // Helper function to round monetary values to 2 decimal places
  const roundToTwoDecimals = (value: number): number => {
    return Math.round(value * 100) / 100;
  };

  const processPayment = async (
    cartItems: CartItem[],
    selectedCustomer: Customer | null,
    selectedLocation: Location,
    paymentMethod: string,
    amountPaid: number,
    saleNotes: string,
    taxRate: number,
    discount: any,
    subtotal: number,
    itemDiscounts: number,
    saleDiscount: number,
    subtotalAfterDiscount: number,
    taxAmount: number,
    totalAmount: number,
    changeGiven: number,
    isCreditSale: boolean = false,
    selectedBroker: any = null
  ) => {
    // Allow partial payments for credit sales or when customer is selected
    if (isCreditSale && !selectedCustomer?.id) {
      toast.error('Credit sale requires selecting a customer');
      return;
    }
    if (!isCreditSale && amountPaid < totalAmount && !selectedCustomer) {
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

    safeSetState(setIsCompletingSale, true);

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

      // Use safe state setters to prevent updates after unmount
      safeSetState(setReceiptCartItems, [...cartItems]);
      const previousCustomerBalance = selectedCustomer
        ? Number(selectedCustomer.balance ?? 0)
        : undefined;
      const invoiceOutstanding =
        previousCustomerBalance !== undefined
          ? roundToTwoDecimals(totalAmount - amountPaid)
          : undefined;
      const projectedCustomerBalance =
        previousCustomerBalance !== undefined && invoiceOutstanding !== undefined
          ? roundToTwoDecimals(previousCustomerBalance + invoiceOutstanding)
          : undefined;

      safeSetState(setReceiptTotals, {
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
        selectedLocation,
        previousCustomerBalance,
        invoiceOutstanding,
        projectedCustomerBalance
      });

      // Round all monetary values to 2 decimal places to match backend validation
      const roundedAmountPaid = roundToTwoDecimals(amountPaid);
      const roundedTotalAmount = roundToTwoDecimals(totalAmount);
      // Ensure taxRate is explicitly set (even if 0) - don't use || 0 which might hide issues
      const roundedTaxRate = taxRate !== undefined && taxRate !== null ? roundToTwoDecimals(taxRate) : 0;

      console.log('Sale data being sent:', {
        taxRate: roundedTaxRate,
        totalAmount: roundedTotalAmount,
        amountPaid: roundedAmountPaid,
        taxAmount,
        subtotal,
        subtotalAfterDiscount
      });

      // Prepare sale data - clean up undefined values
      const saleData: any = {
        saleType: 'RETAIL',
        locationId: selectedLocation.id,
        items: cartItems.map(item => {
          const saleItem: any = {
            itemType: item.itemType,
            itemName: item.itemName,
            quantity: item.quantity,
            unitPrice: roundToTwoDecimals(item.unitPrice), // Round unit price
            itemTaxRate: roundedTaxRate, // Explicitly set tax rate per item
            costPrice: 0 // Default cost price (we don't have cost price in frontend)
          };

          // Handle item discount - send as FIXED amount since user enters dollar amount
          if (item.itemDiscountAmount && item.itemDiscountAmount > 0) {
            saleItem.itemDiscountType = 'FIXED';
            saleItem.itemDiscountRate = roundToTwoDecimals(item.itemDiscountAmount);
          } else {
            saleItem.itemDiscountType = 'PERCENTAGE';
            saleItem.itemDiscountRate = 0;
          }

          // Only include optional fields if they have values
          if (item.productId) saleItem.productId = item.productId;
          if (item.sku) saleItem.sku = item.sku;
          if (item.barcode) saleItem.barcode = item.barcode;
          // Notes is optional, omit if empty

          return saleItem;
        }),
        taxRate: roundedTaxRate // Explicitly send tax rate (even if 0)
      };

      // Only include customerId if customer is selected
      if (selectedCustomer?.id) {
        saleData.customerId = selectedCustomer.id;
      }

      // Include broker info if selected
      if (selectedBroker?.id) {
        saleData.brokerId = selectedBroker.id;
        saleData.brokerCommissionRate = selectedBroker.commissionRate || 0;
      }

      // Include payments only if amountPaid > 0
      if (roundedAmountPaid > 0) {
        saleData.payments = [{
          paymentMethod: paymentMethod,
          amount: roundedAmountPaid // Use rounded amount
        }];

        // Only include optional payment fields if they have values
        const payment = saleData.payments[0];
        if (paymentMethod === 'CARD') {
          payment.referenceNumber = 'CARD' + Date.now().toString().slice(-4);
        }
        if (saleNotes && saleNotes.trim()) {
          payment.notes = saleNotes;
        }
      }

      // Include discount fields if discount is configured (even if value is 0)
      if (discount && discount.type) {
        saleData.discountType = discount.type;
        saleData.discountValue = roundToTwoDecimals(discount.value || 0); // Round discount value
      }

      // Include notes only if provided
      if (saleNotes && saleNotes.trim()) {
        saleData.notes = saleNotes;
      }

      // Include credit sale flag and amounts if needed (all rounded to 2 decimals)
      if (isCreditSale) {
        saleData.isCreditSale = true;
      }
      if (roundedAmountPaid > 0) {
        saleData.amountPaid = roundedAmountPaid;
      }
      if (roundedTotalAmount > 0) {
        saleData.totalAmount = roundedTotalAmount;
      }

      console.log('Creating sale with data:', saleData);

      // Step 1: Create sale (fast operation)
      toast.loading('Processing sale...', { id: 'sale-processing' });
      const response = await apiClient.post('/pos/sales', saleData);
      const sale = response.data;
      console.log('Sale created successfully:', sale);

      // Step 2: Show success message and receipt preview immediately
      toast.success(`Sale completed successfully! Sale #${sale.saleNumber}`, { id: 'sale-processing' });
      safeSetState(setCompletedSale, sale);
      safeSetState(setShowReceiptModal, true);

      // Step 3: Generate receipt in background (non-blocking)
      generateReceiptInBackground(sale.id);

      return { sale, receipt: null };

    } catch (error: any) {
      console.error('Error creating sale:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Full error:', JSON.stringify(error.response?.data, null, 2));

      let errorMessage = 'Failed to complete sale';

      // Handle validation errors
      if (error.response?.data?.details?.message) {
        const validationErrors = error.response.data.details.message;
        if (Array.isArray(validationErrors)) {
          errorMessage = validationErrors.join(', ');
        } else if (typeof validationErrors === 'string') {
          errorMessage = validationErrors;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(`Sale failed: ${errorMessage}`, { duration: 5000 });
      throw error;
    } finally {
      safeSetState(setIsCompletingSale, false);
    }
  };

  // Background receipt generation (non-blocking)
  const generateReceiptInBackground = async (saleId: string) => {
    try {
      console.log('Generating receipt in background for sale:', saleId);
      const receiptResponse = await apiClient.post(`/receipts/generate/${saleId}?format=PDF`);
      const receipt = receiptResponse.data;
      console.log('Receipt generated successfully in background:', receipt);

      // Only update state if component is still mounted
      if (isMountedRef.current) {
        safeSetState(setReceiptData, receipt);
        toast.success('Receipt generated successfully!');
      }

    } catch (receiptError: any) {
      console.error('Error generating receipt in background:', receiptError);
      // Don't show error to user since sale is already complete
      // Only log if component is still mounted
      if (isMountedRef.current) {
        console.log('Receipt generation failed, but sale was completed successfully');
      }
    }
  };

  const generateReceipt = async (saleId: string) => {
    try {
      const receiptResponse = await apiClient.post(`/receipts/generate/${saleId}?format=PDF`);
      const receipt = receiptResponse.data;
      safeSetState(setReceiptData, receipt);
      if (isMountedRef.current) {
        toast.success('Receipt generated successfully!');
      }
      return receipt;
    } catch (error) {
      console.error('Error generating receipt:', error);
      if (isMountedRef.current) {
        toast.error('Failed to generate receipt. Please try again.');
      }
      throw error;
    }
  };

  const downloadReceipt = async (receiptId: string) => {
    let blobUrl: string | null = null;
    try {
      const response = await apiClient.get(`/receipts/${receiptId}/download`, {
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `receipt-${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Clean up link element
      setTimeout(() => {
        document.body.removeChild(link);
        // Revoke blob URL after a short delay to ensure download starts
        if (blobUrl) {
          window.URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
      }, 100);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      // Ensure blob URL is revoked even on error
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      if (isMountedRef.current) {
        toast.error('Failed to download receipt');
      }
    }
  };

  const printReceipt = async (receiptId: string) => {
    let blobUrl: string | null = null;
    let printWindow: Window | null = null;

    try {
      const response = await apiClient.get(`/receipts/${receiptId}/download`, {
        responseType: 'blob'
      });

      // Create blob URL and open in new window for printing
      const blob = new Blob([response.data], { type: 'application/pdf' });
      blobUrl = window.URL.createObjectURL(blob);
      printWindow = window.open(blobUrl, '_blank');

      if (printWindow) {
        // Handle window close and cleanup blob URL
        const handleClose = () => {
          if (blobUrl) {
            window.URL.revokeObjectURL(blobUrl);
            blobUrl = null;
          }
          if (printWindow) {
            printWindow.removeEventListener('beforeunload', handleClose);
          }
        };

        printWindow.addEventListener('beforeunload', handleClose);

        // Fallback: revoke blob URL after a timeout if window is still open
        setTimeout(() => {
          if (blobUrl) {
            // Only revoke if window was closed or after 30 seconds
            try {
              if (!printWindow || printWindow.closed) {
                window.URL.revokeObjectURL(blobUrl);
                blobUrl = null;
              }
            } catch (e) {
              // Window might be cross-origin or closed, revoke anyway
              if (blobUrl) {
                window.URL.revokeObjectURL(blobUrl);
                blobUrl = null;
              }
            }
          }
        }, 30000);

        printWindow.onload = () => {
          printWindow?.print();
        };
      } else {
        // Window was blocked, clean up immediately
        if (blobUrl) {
          window.URL.revokeObjectURL(blobUrl);
          blobUrl = null;
        }
        if (isMountedRef.current) {
          toast.error('Please allow pop-ups to print the receipt');
        }
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      // Ensure blob URL is revoked even on error
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
      if (isMountedRef.current) {
        toast.error('Failed to print receipt');
      }
    }
  };

  return {
    isCompletingSale,
    showReceiptModal,
    setShowReceiptModal,
    completedSale,
    setCompletedSale,
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
  };
};

