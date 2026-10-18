'use client';

import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  FileText, 
  Calculator, 
  RefreshCw, 
  X, 
  MapPin, 
  Settings,
  Archive
} from 'lucide-react';
import { Location } from '@/hooks/pos/useLocations';
import { useBranding } from '@/hooks/useBranding';

interface POSHeaderProps {
  selectedLocation: Location | null;
  onLocationSwitch: () => void;
  onNavigateToDashboard: () => void;
  onHoldInvoice?: () => void;
  onViewHeldInvoices?: () => void;
  onViewInvoice?: () => void;
}

export default function POSHeader({ 
  selectedLocation, 
  onLocationSwitch, 
  onNavigateToDashboard,
  onHoldInvoice,
  onViewHeldInvoices,
  onViewInvoice,
}: POSHeaderProps) {
  const { data: branding } = useBranding();
  const brandingName = branding?.name || 'Point of Sale';

  return (
    <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-700 via-emerald-600 to-sky-600 shadow-lg">
      <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4 lg:px-6 flex items-center justify-between gap-4 text-white">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex flex-col">
            <span className="text-xl sm:text-2xl font-semibold text-white leading-tight">
              {brandingName}
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 shadow-sm backdrop-blur">
            <MapPin className="w-4 h-4 text-emerald-100" />
            <span className="text-xs font-medium text-white truncate max-w-[10rem]">
              {selectedLocation?.name || 'No location selected'}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={onLocationSwitch}
              className="h-6 w-6 p-0 rounded-full text-emerald-100 hover:text-white hover:bg-white/10"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 bg-white/10 border border-white/10 rounded-full px-2 py-1 backdrop-blur">
            <Button
              className="hidden sm:inline-flex bg-emerald-400 hover:bg-emerald-300 text-slate-900 shadow-sm px-3 sm:px-4"
            >
              <CreditCard className="w-4 h-4 mr-1" />
              <span className="text-xs sm:text-sm font-medium">Payment</span>
            </Button>
            <Button
              className="bg-white text-sky-700 hover:bg-sky-50 shadow-sm px-3 sm:px-4"
              onClick={() => {
                if (onViewInvoice) {
                  onViewInvoice();
                } else {
                  console.error('onViewInvoice handler is undefined');
                }
              }}
              disabled={!onViewInvoice}
            >
              <FileText className="w-4 h-4 mr-1" />
              <span className="text-xs sm:text-sm font-medium">View invoice</span>
            </Button>
            <Button
              className="hidden lg:inline-flex bg-cyan-400/80 hover:bg-cyan-400 text-emerald-950 shadow-sm px-3"
            >
              <Calculator className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium">Cash register</span>
            </Button>
            <Button
              className="hidden lg:inline-flex bg-sky-400/90 hover:bg-sky-400 text-white shadow-sm px-3"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              <span className="text-xs font-medium">Refresh</span>
            </Button>
            <Button
              className="bg-emerald-300 hover:bg-emerald-200 text-slate-900 shadow-sm px-3 sm:px-4"
              onClick={() => {
                console.log('Hold Invoice button clicked');
                if (onHoldInvoice) {
                  onHoldInvoice();
                } else {
                  console.error('onHoldInvoice handler is undefined');
                }
              }}
              disabled={!onHoldInvoice}
            >
              <FileText className="w-4 h-4 mr-1" />
              <span className="text-xs sm:text-sm font-medium">Hold invoice</span>
            </Button>
            <Button
              className="hidden sm:inline-flex bg-purple-400/90 hover:bg-purple-300 text-white shadow-sm px-3 sm:px-4"
              onClick={() => {
                console.log('View Held Invoices button clicked');
                if (onViewHeldInvoices) {
                  onViewHeldInvoices();
                } else {
                  console.error('onViewHeldInvoices handler is undefined');
                }
              }}
              disabled={!onViewHeldInvoices}
              title="View held invoices"
            >
              <Archive className="w-4 h-4 mr-1" />
              <span className="text-xs sm:text-sm font-medium">Held invoices</span>
            </Button>
          </div>

          <Button
            className="ml-1 bg-rose-500 hover:bg-rose-400 text-white shadow-sm px-2.5 sm:px-3 rounded-full"
            onClick={onNavigateToDashboard}
          >
            <X className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline text-xs font-medium">Close</span>
          </Button>
        </div>
      </div>

      {/* Mobile location chip */}
      <div className="px-3 pb-3 sm:px-4 lg:px-6 md:hidden">
        <button
          type="button"
          onClick={onLocationSwitch}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs text-white shadow-sm"
        >
          <MapPin className="w-4 h-4 text-emerald-100" />
          <span className="truncate max-w-[9rem]">
            {selectedLocation?.name || 'No location selected'}
          </span>
          <Settings className="w-3 h-3 text-sky-100" />
        </button>
      </div>
    </header>
  );
}
