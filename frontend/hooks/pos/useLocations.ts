import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';

export interface Location {
  id: string;
  name: string;
  address?: string;
}

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationsCache, setLocationsCache] = useState<Location[] | null>(null);

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      // Always fetch fresh locations from API to validate cached location
      const response = await apiClient.get('/locations/pos');
      const data = response.data || [];
      console.log('⚡ Loaded locations from API:', data.length);
      setLocations(data);
      setLocationsCache(data); // Cache the result
      
      // Validate and restore cached location if it exists
      const cachedLocationStr = sessionStorage.getItem('pos-selected-location');
      if (cachedLocationStr) {
        try {
          const cachedLocation = JSON.parse(cachedLocationStr);
          const locationExists = data.some((loc: Location) => loc.id === cachedLocation.id);
          
          if (!locationExists) {
            console.log('⚠️ Cached location no longer exists, clearing cache');
            // Cached location doesn't exist in database - clear it
            sessionStorage.removeItem('pos-selected-location');
            sessionStorage.removeItem('pos-session-location');
            setSelectedLocation(null);
          } else {
            console.log('✅ Restoring cached location:', cachedLocation.name);
            // Restore the cached location to state
            setSelectedLocation(cachedLocation);
          }
        } catch (parseError) {
          console.error('Error parsing cached location:', parseError);
          sessionStorage.removeItem('pos-selected-location');
          sessionStorage.removeItem('pos-session-location');
          setSelectedLocation(null);
        }
      }
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
      // Clear cache on error
      sessionStorage.removeItem('pos-selected-location');
      sessionStorage.removeItem('pos-session-location');
      setSelectedLocation(null);
    } finally {
      setIsLoading(false);
    }
  };

  const selectLocation = (location: Location) => {
    setSelectedLocation(location);
    // Save location for this session
    sessionStorage.setItem('pos-selected-location', JSON.stringify(location));
    sessionStorage.setItem('pos-session-location', 'true');
    toast.success(`Switched to ${location.name}`);
  };

  const clearLocationCache = () => {
    sessionStorage.removeItem('pos-selected-location');
    sessionStorage.removeItem('pos-session-id');
    sessionStorage.removeItem('pos-session-location');
    sessionStorage.removeItem('pos-last-session');
    console.log('Session data cleared');
    toast.success('Session data cleared');
  };

  useEffect(() => {
    loadLocations();
  }, []);

  return {
    locations,
    selectedLocation,
    setSelectedLocation,
    isLoading,
    loadLocations,
    selectLocation,
    clearLocationCache
  };
};

