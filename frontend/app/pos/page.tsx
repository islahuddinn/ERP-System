'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useLocations } from '@/hooks/pos/useLocations';
import LocationSelectionModal from '@/components/pos/location-selection-modal';
import POSLayout from '@/components/pos/POSLayout';

export default function POSPage(): JSX.Element {
  const sessionResult = useSession();
  const session = sessionResult?.data;
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

  // Check for new session on initial load
  useEffect(() => {
    if (!session?.user || !isInitialLoad) return;

    // Get current session info
    const currentSessionEmail = session.user.email;
    const currentSessionId = session.user.id || session.user.email;

    // Check if this is a new session (different user or new login)
    const lastSessionData = sessionStorage.getItem('pos-last-session');
    const isNewSession = !lastSessionData ||
      lastSessionData !== JSON.stringify({ id: currentSessionId, email: currentSessionEmail });

    if (isNewSession) {
      // New session: clear all location data
      console.log('New session detected - clearing location data');
      sessionStorage.removeItem('pos-selected-location');
      sessionStorage.removeItem('pos-session-id');
      sessionStorage.removeItem('pos-session-location');
      sessionStorage.setItem('pos-last-session', JSON.stringify({
        id: currentSessionId,
        email: currentSessionEmail
      }));
      setSelectedLocation(null);
    }

    setIsInitialLoad(false);
  }, [isInitialLoad, session]);

  // Show location modal if no location is selected after locations are loaded
  useEffect(() => {
    if (!locationsLoading && !selectedLocation && locations.length > 0) {
      setShowLocationModal(true);
    }
  }, [locationsLoading, selectedLocation, locations]);

  // Validate selected location still exists in loaded locations
  useEffect(() => {
    if (!locationsLoading && locations.length > 0 && selectedLocation) {
      const locationExists = locations.some((loc: any) => loc.id === selectedLocation.id);

      if (!locationExists) {
        console.log('⚠️ Selected location no longer exists in database, clearing selection');
        sessionStorage.removeItem('pos-selected-location');
        sessionStorage.removeItem('pos-session-location');
        setSelectedLocation(null);
        setShowLocationModal(true);
      }
    }
  }, [locations, locationsLoading, selectedLocation, setSelectedLocation]);

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
      <div className="min-h-screen w-full bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex items-center justify-center px-4">
        <div className="relative max-w-lg w-full bg-white/70 backdrop-blur-xl border border-emerald-100 rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-transparent to-sky-100/40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-white shadow-inner flex items-center justify-center">
              <div className="h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin-slow" />
            </div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-500 font-semibold">POS Workspace</p>
            <h2 className="text-2xl font-semibold text-slate-900">Loading your experience</h2>
            <p className="text-slate-600 text-sm md:text-base">
              Authenticating your session and restoring your workspace preferences...
            </p>
            <div className="w-full bg-white/60 rounded-full h-2 border border-emerald-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-400 animate-loading-bar" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied for non-admin users
  if (session && session.user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 text-center border border-slate-200">
          <div className="text-red-500 text-5xl mb-3">🚫</div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">Access denied</h2>
          <p className="text-slate-600 mb-6 text-sm">
            Admin privileges are required to access the POS workspace.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-sky-600 hover:bg-sky-700 text-white px-6"
          >
            Go to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Loading screens
  if (locationsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-sky-50 px-4">
        <div className="relative max-w-lg w-full bg-white/70 backdrop-blur-xl border border-emerald-100 rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-transparent to-sky-100/40 pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2 text-emerald-700 font-semibold text-sm uppercase tracking-[0.3em]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Preparing Workspace</span>
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">Syncing inventory & layouts</h2>
            <p className="text-slate-600 text-sm md:text-base">
              Fetching locations, customers, and held invoices so everything is ready when you arrive.
            </p>
            <div className="w-full bg-white/60 rounded-full h-2 border border-emerald-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-sky-400 animate-loading-bar" />
            </div>
          </div>
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
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 px-4">
            <div className="max-w-md w-full bg-white/80 backdrop-blur rounded-2xl shadow-xl p-8 text-center border border-slate-200">
              <div className="text-amber-500 text-5xl mb-3">⚠️</div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">No locations configured</h2>
              <p className="text-slate-600 mb-6 text-sm">
                Add at least one location to start using the POS system.
              </p>
              <Button
                onClick={() => router.push('/dashboard/locations')}
                className="bg-sky-600 hover:bg-sky-700 text-white px-6"
              >
                Go to locations
              </Button>
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
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50">
        <POSLayout
          selectedLocation={selectedLocation}
          onLocationSwitch={handleLocationSwitch}
          onNavigateToDashboard={handleNavigateToDashboard}
        />
      </div>
    </>
  );
}
