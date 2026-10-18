import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  balance?: number;
  transactionCount?: number;
  lastTransactionDate?: string;
}

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch customer balance from ledger overview
  const fetchCustomerBalance = async (customerId: string): Promise<number | undefined> => {
    try {
      const response = await apiClient.get(`/customers/ledger-overview`);
      const ledgerData = response.data;
      if (Array.isArray(ledgerData)) {
        const customer = ledgerData.find((c: any) => c.id === customerId);
        return customer?.balance !== undefined ? Number(customer.balance) : undefined;
      }
      return undefined;
    } catch (error) {
      console.error('Error fetching customer balance:', error);
      return undefined;
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/customers');
      const data = response.data;
      const customersList = data.data || [];
      
      // Fetch balances and transaction data from ledger overview
      try {
        const ledgerResponse = await apiClient.get('/customers/ledger-overview');
        const ledgerData = ledgerResponse.data || [];
        if (Array.isArray(ledgerData)) {
          // Map balances and transaction data to customers
          const customersWithBalance = customersList.map((customer: Customer) => {
            const ledgerCustomer = ledgerData.find((lc: any) => lc.id === customer.id);
            return {
              ...customer,
              balance: ledgerCustomer?.balance !== undefined ? Number(ledgerCustomer.balance) : customer.balance,
              transactionCount: ledgerCustomer?.transactionCount || 0,
              lastTransactionDate: ledgerCustomer?.lastTransactionDate || undefined,
            };
          });
          
          // Sort by most used: transactionCount (desc), then lastTransactionDate (desc)
          const sortedCustomers = customersWithBalance.sort((a: Customer, b: Customer) => {
            // First sort by transaction count (higher first)
            const countA = a.transactionCount || 0;
            const countB = b.transactionCount || 0;
            if (countB !== countA) {
              return countB - countA;
            }
            // If transaction count is same, sort by last transaction date (more recent first)
            if (a.lastTransactionDate && b.lastTransactionDate) {
              return new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime();
            }
            if (a.lastTransactionDate) return -1;
            if (b.lastTransactionDate) return 1;
            return 0;
          });
          
          setCustomers(sortedCustomers);
        } else {
          setCustomers(customersList);
        }
      } catch (balanceError) {
        console.warn('Error fetching customer balances, using default:', balanceError);
        setCustomers(customersList);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCustomer = async (customerData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => {
    if (!customerData.name.trim()) {
      toast.error('Please enter customer name');
      return null;
    }

    try {
      const response = await apiClient.post('/customers', customerData);
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      const newCustomer = response.data?.data || response.data;

      // Add to customers list
      setCustomers(prev => [...prev, newCustomer]);
      
      // Select the new customer
      setSelectedCustomer(newCustomer);
      
      toast.success('Customer created successfully');
      return newCustomer;
    } catch (error: any) {
      console.error('Error creating customer:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create customer';
      toast.error(errorMessage);
      return null;
    }
  };

  const searchCustomers = async (query: string): Promise<Customer[]> => {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const response = await apiClient.get(`/customers/search?q=${encodeURIComponent(query)}`);
      const customers = response.data || [];
      
      // Fetch balances and transaction data for all searched customers from ledger overview
      try {
        const ledgerResponse = await apiClient.get(`/customers/ledger-overview?search=${encodeURIComponent(query)}`);
        const ledgerData = ledgerResponse.data || [];
        if (Array.isArray(ledgerData)) {
          // Map balances and transaction data to customers
          const customersWithData = customers.map((customer: Customer) => {
            const ledgerCustomer = ledgerData.find((lc: any) => lc.id === customer.id);
            return {
              ...customer,
              balance: ledgerCustomer?.balance !== undefined ? Number(ledgerCustomer.balance) : customer.balance,
              transactionCount: ledgerCustomer?.transactionCount || 0,
              lastTransactionDate: ledgerCustomer?.lastTransactionDate || undefined,
            };
          });
          
          // Sort by most used: transactionCount (desc), then lastTransactionDate (desc)
          return customersWithData.sort((a: Customer, b: Customer) => {
            const countA = a.transactionCount || 0;
            const countB = b.transactionCount || 0;
            if (countB !== countA) {
              return countB - countA;
            }
            if (a.lastTransactionDate && b.lastTransactionDate) {
              return new Date(b.lastTransactionDate).getTime() - new Date(a.lastTransactionDate).getTime();
            }
            if (a.lastTransactionDate) return -1;
            if (b.lastTransactionDate) return 1;
            return 0;
          });
        }
      } catch (balanceError) {
        console.warn('Error fetching customer balances, using default:', balanceError);
      }
      
      return customers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    }
  };

  // Enhanced setSelectedCustomer that fetches balance
  const setSelectedCustomerWithBalance = (customer: Customer | null) => {
    // Set customer immediately (synchronous)
    setSelectedCustomer(customer);
    
    // Fetch balance in background if customer is selected
    if (customer && customer.id) {
      fetchCustomerBalance(customer.id).then((balance) => {
        if (balance !== undefined) {
          setSelectedCustomer((prev) => {
            if (prev && prev.id === customer.id) {
              return { ...prev, balance };
            }
            return prev;
          });
        }
      }).catch((error) => {
        console.warn('Failed to fetch customer balance:', error);
      });
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  return {
    customers,
    selectedCustomer,
    setSelectedCustomer: setSelectedCustomerWithBalance,
    isLoading,
    loadCustomers,
    createCustomer,
    searchCustomers
  };
};

