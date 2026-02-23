import * as Location from 'expo-location';

export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

class MapService {
  static async getCurrentLocation(): Promise<LocationData | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  }

  static async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const address = result[0];
        return `${address.street || ''} ${address.city || ''} ${address.region || ''}`.trim();
      }
      return 'Unknown location';
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      return 'Unknown location';
    }
  }

  static createRegion(latitude: number, longitude: number, delta: number = 0.01): MapRegion {
    return {
      latitude,
      longitude,
      latitudeDelta: delta,
      longitudeDelta: delta,
    };
  }

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

export default MapService;