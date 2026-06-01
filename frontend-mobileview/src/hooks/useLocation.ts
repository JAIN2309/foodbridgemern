import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

export const useLocation = () => {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setError('Location permission denied. Please enable location in Settings.');
      setLoading(false);
      return;
    }

    // Try high accuracy first (GPS), fall back to low accuracy (network/WiFi)
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setLoading(false);
    } catch {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setLoading(false);
      } catch (err: any) {
        setError('Unable to detect location. Please try again.');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { fetchLocation(); }, [fetchLocation]);

  return { location, error, loading, retry: fetchLocation };
};
