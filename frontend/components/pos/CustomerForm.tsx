'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Customer } from '@/hooks/pos/useCustomers';
import { formatCurrency } from '@/lib/currency';
import CustomerSearch from './CustomerSearch';

interface CustomerFormProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  onCreateCustomer: (customerData: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }) => Promise<Customer | null>;
  // Search props
  customerSearchTerm?: string;
  onCustomerSearchChange?: (value: string) => void;
  customerSearchResults?: Customer[];
  showCustomerSearchDropdown?: boolean;
  customerSearchLoading?: boolean;
  selectedCustomerSearchIndex?: number;
  onCustomerSearchFocus?: () => void;
  onCustomerSearchBlur?: () => void;
  onCustomerSearchKeyDown?: (e: React.KeyboardEvent) => void;
  darkMode?: boolean;
}

export default function CustomerForm({
  customers,
  selectedCustomer,
  onCustomerSelect,
  onCreateCustomer,
  customerSearchTerm = '',
  onCustomerSearchChange,
  customerSearchResults = [],
  showCustomerSearchDropdown = false,
  customerSearchLoading = false,
  selectedCustomerSearchIndex = -1,
  onCustomerSearchFocus,
  onCustomerSearchBlur,
  onCustomerSearchKeyDown,
  darkMode = false
}: CustomerFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    address: ''
  });

  const handleCreateCustomer = async () => {
    if (!formData.name.trim()) {
      return;
    }

    const customerData = {
      name: formData.name,
      email: formData.contact.includes('@') ? formData.contact : undefined,
      phone: formData.contact.includes('@') ? undefined : formData.contact,
      address: formData.address || undefined
    };

    const newCustomer = await onCreateCustomer(customerData);
    
    if (newCustomer) {
      // Clear form
      setFormData({
        name: '',
        contact: '',
        address: ''
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Customer Search */}
      {onCustomerSearchChange && (
        <CustomerSearch
          searchTerm={customerSearchTerm}
          onSearchChange={onCustomerSearchChange}
          onCustomerSelect={onCustomerSelect}
          searchResults={customerSearchResults}
          showDropdown={showCustomerSearchDropdown}
          searchLoading={customerSearchLoading}
          selectedIndex={selectedCustomerSearchIndex}
          onSearchFocus={onCustomerSearchFocus || (() => {})}
          onSearchBlur={onCustomerSearchBlur || (() => {})}
          onSearchKeyDown={onCustomerSearchKeyDown || (() => {})}
        />
      )}
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Select 
            value={selectedCustomer?.id || ''} 
            onValueChange={(value) => {
              if (value === 'walk_in') {
                onCustomerSelect(null);
              } else {
                const customer = customers.find(c => c.id === value);
                onCustomerSelect(customer || null);
              }
            }}
          >
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
          onClick={handleCreateCustomer}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={!formData.name.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Name</label>
          <Input 
            placeholder="Name" 
            value={formData.name} 
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className={darkMode ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500" : ""}
          />
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Contact#</label>
          <Input 
            placeholder="Contact#" 
            value={formData.contact} 
            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
            className={darkMode ? "bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-500" : ""}
          />
        </div>
      </div>

      {/* Customer Balance Display */}
      {selectedCustomer && (
        <div className={darkMode ? "bg-gray-800/50 border border-gray-700 rounded-md p-3" : "bg-gray-50 border border-gray-200 rounded-md p-3"}>
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Current Balance:</span>
            {selectedCustomer.balance !== undefined ? (
              <span className={`text-sm font-bold ${
                Number(selectedCustomer.balance) > 0 
                  ? darkMode ? 'text-red-400' : 'text-red-600'
                  : Number(selectedCustomer.balance) < 0 
                  ? darkMode ? 'text-green-400' : 'text-green-600'
                  : darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {Number(selectedCustomer.balance) > 0
                  ? `${formatCurrency(Number(selectedCustomer.balance))} (Owes)`
                  : Number(selectedCustomer.balance) < 0
                  ? `${formatCurrency(Math.abs(Number(selectedCustomer.balance)))} (Credit)`
                  : `${formatCurrency(0)} (Paid Up)`
                }
              </span>
            ) : (
              <span className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Loading...</span>
            )}
          </div>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (selectedCustomer?.id) {
                  window.open(`/dashboard/customers/${selectedCustomer.id}/ledger`, '_blank');
                }
              }}
              className={`text-xs ${darkMode ? "border-gray-600 text-gray-300 hover:bg-gray-700" : "border-gray-300 text-gray-700 hover:bg-gray-100"}`}
            >
              View Ledger
            </Button>
          </div>
        </div>
      )}
      
      <div>
        <label className={`block text-xs font-medium mb-1 ${darkMode ? "text-gray-300" : "text-gray-900"}`}>Address</label>
        <textarea 
          className={`w-full p-2 border rounded-md ${darkMode ? "border-gray-600 bg-gray-800/50 text-white placeholder:text-gray-500" : "border-gray-300"}`}
          rows={3}
          placeholder="Address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
        />
      </div>
    </div>
  );
}
