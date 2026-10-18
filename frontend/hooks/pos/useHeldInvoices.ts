import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/lib/api-client';
import { CartItem } from './useCart';

export interface HeldInvoice {
  id: string;
  referenceNumber: string;
  customerId?: string;
  brokerId?: string;
  locationId: string;
  name?: string;
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: string;
  discountValue?: number;
  discountAmount: number;
  totalAmount: number;
  biltyAddress?: string;
  biltyContact?: string;
  labourExpense?: number;
  freightCharges?: number;
  notes?: string;
  heldAt: string;
  restoredAt?: string | null;
  restoredBy?: string | null;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  broker?: {
    id: string;
    name: string;
    brokerCode: string;
    commissionRate: number;
    phone?: string;
    zone?: any;
  };
  location?: {
    id: string;
    name: string;
  };
  holder?: {
    id: string;
    name: string;
    email: string;
  };
  restorer?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface HoldInvoiceData {
  locationId: string;
  customerId?: string;
  brokerId?: string;
  name?: string;
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discountType?: 'PERCENTAGE' | 'FIXED';
  discountValue?: number;
  discountAmount: number;
  totalAmount: number;
  biltyAddress?: string;
  biltyContact?: string;
  labourExpense?: number;
  freightCharges?: number;
  notes?: string;
}

export const useHeldInvoices = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);
  const [lastLocationFilter, setLastLocationFilter] = useState<string | undefined>(undefined);

  const holdInvoice = async (data: HoldInvoiceData): Promise<HeldInvoice> => {
    setIsLoading(true);
    try {
      console.log('Sending hold invoice data:', JSON.stringify(data, null, 2));
      const response = await apiClient.post('/pos/hold-invoice', data);
      toast.success('Invoice held successfully!');
      return response.data;
    } catch (error: any) {
      console.error('Hold invoice error:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        JSON.stringify(error.response?.data) ||
        'Failed to hold invoice';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getHeldInvoices = async (locationId?: string): Promise<HeldInvoice[]> => {
    setIsLoading(true);
    try {
      const params = locationId ? { locationId } : {};
      setLastLocationFilter(locationId);
      const response = await apiClient.get('/pos/held-invoices', { params });
      const invoices = response.data;
      setHeldInvoices(invoices);
      return invoices;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch held invoices';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getHeldInvoiceById = async (id: string): Promise<HeldInvoice> => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(`/pos/held-invoices/${id}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch held invoice';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const restoreHeldInvoice = async (id: string): Promise<HeldInvoice> => {
    setIsLoading(true);
    try {
      const response = await apiClient.post(`/pos/held-invoices/${id}/restore`);
      toast.success('Invoice restored to cart!');
      // Refresh the list
      await getHeldInvoices(lastLocationFilter);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to restore invoice';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHeldInvoice = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      await apiClient.delete(`/pos/held-invoices/${id}`);
      toast.success('Held invoice deleted successfully!');
      // Refresh the list
      await getHeldInvoices(lastLocationFilter);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete held invoice';
      toast.error(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    heldInvoices,
    holdInvoice,
    getHeldInvoices,
    getHeldInvoiceById,
    restoreHeldInvoice,
    deleteHeldInvoice,
  };
};

