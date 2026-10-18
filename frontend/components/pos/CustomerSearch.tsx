'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Customer } from '@/hooks/pos/useCustomers';
import { formatBalanceStatus } from '@/lib/currency';

interface CustomerSearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onCustomerSelect: (customer: Customer | null) => void;
  searchResults: Customer[];
  showDropdown: boolean;
  searchLoading: boolean;
  selectedIndex: number;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
}

export default function CustomerSearch({
  searchTerm,
  onSearchChange,
  onCustomerSelect,
  searchResults,
  showDropdown,
  searchLoading,
  selectedIndex,
  onSearchFocus,
  onSearchBlur,
  onSearchKeyDown
}: CustomerSearchProps) {

  return (
    <div className="flex-1 relative mb-3">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
      <div className="relative">
        <Input
          placeholder="Search Customer..."
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
              <>
                <div
                  onClick={() => onCustomerSelect(null)}
                  className="p-3 cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                >
                  <div className="font-medium text-gray-900">Walk-in Customer</div>
                  <div className="text-sm text-gray-500">No customer selected</div>
                </div>
                {searchResults.map((customer, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={customer.id}
                      onClick={() => onCustomerSelect(customer)}
                      className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.email && (
                            <div className="text-sm text-gray-500">{customer.email}</div>
                          )}
                          {customer.phone && (
                            <div className="text-sm text-gray-500">{customer.phone}</div>
                          )}
                          <div className="text-xs text-yellow-700 mt-1">
                            {formatBalanceStatus(customer.balance)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="p-3 text-center text-gray-500">
                No customers found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

