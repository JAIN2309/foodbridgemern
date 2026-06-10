import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { LocationData } from './mapService';

// Reads EXPO_PUBLIC_API_URL from .env (update the IP there when your network
// changes). Falls back to the hardcoded LAN IP if the env var is unset.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.17.24.65:5001/api';
export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout
});

api.interceptors.request.use(
  async (config) => {
    console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    if (config.data) {
      // Don't log FormData details (too verbose)
      if (config.data instanceof FormData) {
        console.log('📦 Request Data: FormData (multipart)');
        config.headers['Content-Type'] = 'multipart/form-data';
      } else {
        console.log('📦 Request Data:', JSON.stringify(config.data));
      }
    }
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.log('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', response.status, response.config.url);
    if (response.data) {
      console.log('📦 Response Data:', JSON.stringify(response.data).substring(0, 200));
    }
    return response;
  },
  async (error) => {
    console.log('❌ API Response Error:', error.response?.status, error.message);
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

// Map API functions
export const mapAPI = {
  findNearby: (location: LocationData, type: 'donations' | 'ngos', radius = 10) =>
    api.post('/map/nearby', { ...location, type, radius }),
  
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) =>
    api.post('/map/distance', { lat1, lon1, lat2, lon2 })
};

// Biometric API functions
export const biometricAPI = {
  toggle: (enabled: boolean) => api.put('/users/biometric/toggle', { enabled }),
  getStatus: () => api.get('/users/biometric/status')
};

export default api;
