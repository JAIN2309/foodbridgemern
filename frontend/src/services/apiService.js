const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class ApiLogger {
  static log(method, url, status, data, error = null) {
    const timestamp = new Date().toISOString();
    const statusColor = status >= 400 ? '🔴' : status >= 300 ? '🟡' : '🟢';
    
    console.group(`${statusColor} [${timestamp}] ${method.toUpperCase()} ${url} - ${status}`);
    
    if (data && method !== 'GET') {
      console.log('📤 Request Data:', data);
    }
    
    if (error) {
      console.error('❌ Error:', error);
    }
    
    console.groupEnd();
  }
}

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseURL}${endpoint}`;
    const startTime = Date.now();
    
    console.log(`🔵 [${new Date().toISOString()}] ${method.toUpperCase()} ${endpoint}`);
    
    try {
      const config = {
        method: method.toUpperCase(),
        headers: this.getAuthHeaders(),
      };

      if (data && method.toUpperCase() !== 'GET') {
        config.body = JSON.stringify(data);
        console.log('📝 Request Body:', data);
      }

      const response = await fetch(url, config);
      const responseData = await response.json();
      const duration = Date.now() - startTime;

      ApiLogger.log(method, endpoint, response.status, data);
      console.log(`⏱️ Duration: ${duration}ms`);
      console.log('📥 Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || `HTTP ${response.status}`);
      }

      return responseData;
    } catch (error) {
      const duration = Date.now() - startTime;
      ApiLogger.log(method, endpoint, 0, data, error.message);
      console.log(`⏱️ Duration: ${duration}ms`);
      throw error;
    }
  }

  // Auth endpoints
  async login(credentials) {
    return this.request('POST', '/auth/login', credentials);
  }

  async register(userData) {
    return this.request('POST', '/auth/register', userData);
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  // Donation endpoints
  async createDonation(donationData) {
    return this.request('POST', '/donations', donationData);
  }

  async getNearbyDonations(longitude, latitude, maxDistance = 10000, minQuality = 0) {
    return this.request('GET', `/donations/nearby?longitude=${longitude}&latitude=${latitude}&maxDistance=${maxDistance}&minQuality=${minQuality}`);
  }

  async claimDonation(donationId) {
    return this.request('POST', `/donations/${donationId}/claim`);
  }

  async markCollected(donationId, rating = null, review = null) {
    return this.request('POST', `/donations/${donationId}/collect`, { rating, review });
  }

  async getDonorHistory() {
    return this.request('GET', '/donations/history/donor');
  }

  async getNGOHistory() {
    return this.request('GET', '/donations/history/ngo');
  }

  // User endpoints
  async getPendingUsers() {
    return this.request('GET', '/users/pending');
  }

  async verifyUser(userId, action) {
    return this.request('PUT', `/users/${userId}/verify`, { action });
  }

  async getStats() {
    return this.request('GET', '/users/stats');
  }

  async getAllUsers() {
    return this.request('GET', '/users');
  }

  // Enhanced endpoints
  async syncOfflineActions(pendingActions) {
    return this.request('POST', '/donations/sync-offline', { pending_actions: pendingActions });
  }

  async getOfflinePackage(longitude, latitude) {
    return this.request('GET', `/donations/offline-package?longitude=${longitude}&latitude=${latitude}`);
  }
}

export default new ApiService();