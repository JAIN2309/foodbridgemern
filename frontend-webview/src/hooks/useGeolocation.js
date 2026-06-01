import { useState, useEffect, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(true);

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Try accurate first, fall back to network-based on timeout/error
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude:  position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLoading(false);
      },
      () => {
        // Accurate failed — retry with low accuracy (WiFi/IP based, works on desktop)
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude:  position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setLoading(false);
          },
          (err) => {
            setError(err.code === 1
              ? 'Location permission denied. Please allow location access in your browser.'
              : 'Unable to detect location. Please try again.');
            setLoading(false);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 }
        );
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  return { location, error, loading, retry: fetchLocation };
};
