import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tripsApi, wishlistApi } from '../lib/api';
import { useAuth } from '../lib/auth';

/**
 * Single source of truth for trips + wishlist. Works with the live API when
 * VITE_API_URL is configured and with the clearly-labelled demo store otherwise.
 */
export const TripsContext = createContext(null);

export function TripsProvider({ children }) {
  const { user, token } = useAuth();
  const [trips, setTrips] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const identity = user?.id || user?._id || user?.email || 'guest';

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([tripsApi.list(), wishlistApi.list()]).then(([t, w]) => {
      if (!active) return;
      setTrips(t.status === 'fulfilled' && Array.isArray(t.value) ? t.value : []);
      setWishlist(w.status === 'fulfilled' && Array.isArray(w.value) ? w.value : []);
      setLoading(false);
    });
    return () => { active = false; };
  }, [identity, token]);

  const saveTrip = useCallback(async (trip) => {
    const saved = await tripsApi.save(trip);
    setTrips((prev) => {
      const next = prev.filter((t) => t.id !== saved.id);
      return [saved, ...next];
    });
    return saved;
  }, []);

  const deleteTrip = useCallback(async (id) => {
    await tripsApi.remove(id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleWishlist = useCallback(async (destinationId) => {
    const next = await wishlistApi.toggle(destinationId);
    setWishlist(Array.isArray(next) ? next : []);
    return next;
  }, []);

  const value = useMemo(() => ({
    trips, saveTrip, deleteTrip, wishlist, toggleWishlist, loading,
    isSaved: (id) => wishlist.includes(id),
  }), [trips, saveTrip, deleteTrip, wishlist, toggleWishlist, loading]);

  return <TripsContext.Provider value={value}>{children}</TripsContext.Provider>;
}

export function useTrips() {
  const ctx = useContext(TripsContext);
  if (!ctx) throw new Error('useTrips must be used inside <TripsProvider>');
  return ctx;
}
