'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/hooks/pos/useLocations';
import LocationSelectionModal from '@/components/pos/location-selection-modal';
import POSHeader from '@/components/pos/POSHeader';
import POSLayout from '@/components/pos/POSLayout';

export default function POSPage(): JSX.Element {
  const { data: session } = useSession();
  const router = useRouter();

  // Location management
  const {
    locations,
    selectedLocation,
    setSelectedLocation,
    isLoading: locationsLoading,
    selectLocation,
    clearLocationCache
  } = useLocations();

  // Local state
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Check for saved location on initial load
  useEffect(() => {
    const checkSavedLocation = () => {
      if (!session?.user) return;
      
      // Get current session info
      const currentSessionEmail = session.user.email;
      const currentSessionId = session.user.id || session.user.email;
      
      console.log('Current session:', { id: currentSessionId, email: currentSessionEmail });
      
      // Check if this is a new session (different user or new login)
      const lastSessionData = sessionStorage.getItem('pos-last-session');
      console.log('Last session data:', lastSessionData);
      
      const isNewSession = !lastSessionData || 
        lastSessionData !== JSON.stringify({ id: currentSessionId, email: currentSessionEmail });
      
      console.log('Is new session:', isNewSession);
      
      if (isNewSession) {
        // New session: clear all location data and show modal
        console.log('New session detected - clearing location data and showing modal');
        sessionStorage.removeItem('pos-selected-location');
        sessionStorage.removeItem('pos-session-id');
        sessionStorage.removeItem('pos-session-location');
        sessionStorage.setItem('pos-last-session', JSON.stringify({ 
          id: currentSessionId, 
          email: currentSessionEmail 
        }));
        setShowLocationModal(true);
        return;
      }
      
      // Same session: check if we're coming from dashboard (no saved location in this session)
      const hasLocationInThisSession = sessionStorage.getItem('pos-session-location');
      console.log('Has location in this session:', hasLocationInThisSession);
      
      if (!hasLocationInThisSession) {
        // First time opening POS in this session - show modal
        console.log('First time opening POS in this session - showing modal');
        setShowLocationModal(true);
        return;
      }
      
      // Same session with saved location: use it
      const savedLocation = sessionStorage.getItem('pos-selected-location');
      console.log('Saved location:', savedLocation);
      
      if (savedLocation) {
        try {
          const location = JSON.parse(savedLocation);
          console.log('Using saved location:', location);
          setSelectedLocation(location);
          setIsInitialLoad(false);
        } catch (error) {
          console.error('Error parsing saved location:', error);
          sessionStorage.removeItem('pos-selected-location');
          setShowLocationModal(true);
        }
      } else {
        console.log('No saved location - showing modal');
        setShowLocationModal(true);
      }
    };

    if (isInitialLoad && session) {
      checkSavedLocation();
    }
  }, [isInitialLoad, session, setSelectedLocation]);

  // Check if user is admin
  useEffect(() => {
    if (session && session.user?.role !== 'ADMIN') {
      toast.error('Access denied. Admin privileges required.');
      router.push('/dashboard');
    }
  }, [session, router]);

  // Location selection handlers
  const handleLocationSelect = (location: any) => {
    selectLocation(location);
    setShowLocationModal(false);
    setIsInitialLoad(false);
  };

  const handleLocationSwitch = () => {
    setShowLocationModal(true);
  };

  const handleLocationModalClose = () => {
    if (!selectedLocation) {
      // If no location is selected and user tries to close, redirect to dashboard
      router.push('/dashboard');
    } else {
      setShowLocationModal(false);
    }
  };

  const handleNavigateToDashboard = () => {
    router.push('/dashboard');
  };

  // Show loading while checking session
  if (session === undefined) {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS system...</p>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (session && session.user?.role !== 'ADMIN') {
    return (
      <div className="h-screen w-full bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Admin privileges required to access POS system.</p>
          <Button onClick={() => router.push('/dashboard')} className="bg-blue-600 hover:bg-blue-700 text-white">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Loading screens
  if (locationsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS system...</p>
        </div>
      </div>
    );
  }

  // Show location selection modal if no location is selected
  if (!selectedLocation || showLocationModal) {
    return (
      <>
        <LocationSelectionModal
          isOpen={showLocationModal || !selectedLocation}
          onLocationSelect={handleLocationSelect}
          onClose={handleLocationModalClose}
        />
        {!selectedLocation && !showLocationModal && (
          <div className="h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Locations Available</h2>
              <p className="text-gray-600 mb-4">Please add a location before using the POS system.</p>
              <Button onClick={() => router.push('/dashboard/locations')}>Go to Locations</Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Main POS Interface
  return (
    <>
      <LocationSelectionModal
        isOpen={showLocationModal}
        onLocationSelect={handleLocationSelect}
        onClose={handleLocationModalClose}
      />
      <div className="h-screen w-full bg-gray-900">
        <POSHeader
          selectedLocation={selectedLocation}
          onLocationSwitch={handleLocationSwitch}
          onNavigateToDashboard={handleNavigateToDashboard}
        />
        <POSLayout
          selectedLocation={selectedLocation}
          onLocationSwitch={handleLocationSwitch}
          onNavigateToDashboard={handleNavigateToDashboard}
        />
      </div>
    </>
  );
}
