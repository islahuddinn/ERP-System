'use client';

import { useState, useEffect } from 'react';
import { X, MapPin, Building2, Warehouse } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

interface Location {
  id: string;
  name: string;
  address?: string;
  type?: string;
}

interface LocationSelectionModalProps {
  isOpen: boolean;
  onLocationSelect: (location: Location) => void;
  onClose: () => void;
}

export default function LocationSelectionModal({ 
  isOpen, 
  onLocationSelect, 
  onClose 
}: LocationSelectionModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  // Load locations when modal opens
  useEffect(() => {
    if (isOpen) {
      loadLocations();
    }
  }, [isOpen]);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/locations');
      const responseData = response.data;
      // Handle wrapped response from ResponseInterceptor
      // Response format: { success: true, message: string, data: { data: [...], meta: {...} } }
      // Or direct: { data: [...], meta: {...} }
      const locationsArray = Array.isArray(responseData?.data) 
        ? responseData.data 
        : Array.isArray(responseData?.data?.data)
        ? responseData.data.data
        : Array.isArray(responseData)
        ? responseData
        : [];
      setLocations(locationsArray);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = () => {
    if (!selectedLocationId) {
      toast.error('Please select a location');
      return;
    }

    const selectedLocation = locations.find(loc => loc.id === selectedLocationId);
    if (selectedLocation) {
      // Store selected location in sessionStorage for persistence
      sessionStorage.setItem('pos-selected-location', JSON.stringify(selectedLocation));
      onLocationSelect(selectedLocation);
      // Don't call onClose() here - let the parent handle closing the modal
    }
  };

  const getLocationIcon = () => {
    // Locations are now generic geographic places; use a single consistent icon
    return <MapPin className="w-5 h-5 text-gray-600" />;
  };

  const getLocationCardStyle = () => {
    // Single visual style for all locations
    return 'bg-gradient-to-r from-slate-50 to-white border border-slate-100 hover:shadow-md';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white via-emerald-50 to-slate-50 border border-emerald-100 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100 bg-white/70 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500 font-semibold">Locations</p>
            <h2 className="text-2xl font-semibold text-slate-900">Select Location for POS</h2>
            <p className="text-sm text-slate-600 mt-1">Choose where you want to operate from</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white/40">
          <div className="px-6 py-5 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-200 scrollbar-track-transparent">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-10 w-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin-slow"></div>
                <span className="ml-3 text-emerald-600 font-medium">Loading locations...</span>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Locations Available</h3>
                <p className="text-slate-600 mb-4">Please add a location before using the POS system.</p>
                <Button 
                  onClick={() => window.open('/dashboard/locations', '_blank')}
                  className="bg-gradient-to-r from-emerald-600 to-sky-500 hover:from-emerald-500 hover:to-sky-400 text-white shadow-lg"
                >
                  Go to Locations
                </Button>
              </div>
            ) : (
              <div className="space-y-4 pb-2">
              {locations.map((location) => (
                <Card
                  key={location.id}
                  className={`cursor-pointer transition-all duration-300 border-2 rounded-2xl shadow-sm ${
                    selectedLocationId === location.id
                      ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-sky-50 shadow-lg scale-[1.01]'
                      : getLocationCardStyle()
                  }`}
                  onClick={() => setSelectedLocationId(location.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      {getLocationIcon()}
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900 text-lg">{location.name}</h3>
                        {location.address && (
                          <p className="text-sm text-slate-600 mt-1">{location.address}</p>
                        )}
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedLocationId === location.id
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-200'
                      }`}>
                        {selectedLocationId === location.id && (
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
            {/* Scroll hint when there are many locations */}
            {locations.length > 3 && (
              <div className="text-center text-xs text-slate-500 mt-3 pb-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full border border-emerald-100 bg-white/70 text-[10px] uppercase tracking-[0.2em] text-emerald-500">Scroll for more</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-5 border-t border-emerald-100 bg-white/80 backdrop-blur flex-shrink-0">
          <Button
            onClick={onClose}
            className="bg-white hover:bg-emerald-50 text-slate-700 border border-emerald-100 hover:border-emerald-200 px-6 py-2 font-medium rounded-xl transition-colors shadow-sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLocationSelect}
            disabled={!selectedLocationId}
            className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-sky-500 hover:from-emerald-500 hover:to-sky-400 text-white disabled:bg-gray-300 disabled:cursor-not-allowed px-6 py-2 rounded-xl shadow-lg"
          >
            Select Location
          </Button>
        </div>
      </div>
    </div>
  );
}
