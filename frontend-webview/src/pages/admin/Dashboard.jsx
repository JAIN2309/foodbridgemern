import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  MapPin,
  Clock,
  TrendingUp
} from 'lucide-react';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState({});
  const [activeDonations, setActiveDonations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    checkBackendHealth();
    fetchData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    
    // Listen for sidebar navigation events
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
    };
    
    const handleForceUpdate = (event) => {
      setActiveTab(event.detail);
    };
    
    window.addEventListener('dashboardTabChange', handleTabChange);
    window.addEventListener('forceTabUpdate', handleForceUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboardTabChange', handleTabChange);
      window.removeEventListener('forceTabUpdate', handleForceUpdate);
    };
  }, [location.search]);

  const checkBackendHealth = async () => {
    try {
      const response = await api.get('/users/health');
      console.log('Backend health check:', response.data);
    } catch (error) {
      console.error('Backend health check failed:', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      console.log('Fetching admin data...');
      const [pendingRes, statsRes, donationsRes, usersRes] = await Promise.all([
        api.get('/users/pending'),
        api.get('/users/stats'),
        api.get('/users/donations/all'),
        api.get('/users/all')
      ]);
      
      console.log('API responses:', {
        pending: pendingRes.data,
        stats: statsRes.data,
        donations: donationsRes.data,
        users: usersRes.data
      });
      
      setPendingUsers(pendingRes.data || []);
      setStats(statsRes.data || {});
      setActiveDonations(donationsRes.data || []);
      setAllUsers(usersRes.data || []);
      setDataLoaded(true);
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || error.message;
      setApiError(errorMsg);
      toast.error(`Failed to fetch data: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyUser = async (userId, approved) => {
    setIsLoading(true);
    try {
      await api.put(`/users/${userId}/verify`, { approved });
      toast.success(`User ${approved ? 'approved' : 'rejected'} successfully`);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error('Failed to update user status');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.admin.title')}</h1>
          <p className="text-gray-600">{t('dashboard.admin.subtitle')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('dashboard.admin.autoRefresh')}</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <span>{t('dashboard.admin.refreshData')}</span>
          )}
        </button>
      </div>

      {/* API Error Alert */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <h3 className="text-red-800 font-medium">{t('dashboard.admin.apiError')}</h3>
              <p className="text-red-700 text-sm mt-1">
                {apiError}. {t('dashboard.admin.apiErrorDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-2">{t('dashboard.admin.loadingData')}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.admin.totalUsers')}</p>
              <p className="text-lg font-semibold">{stats.users?.total || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.admin.verifiedUsers')}</p>
              <p className="text-lg font-semibold">{stats.users?.verified || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.admin.pendingApproval')}</p>
              <p className="text-lg font-semibold">{stats.users?.pending || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.admin.mealsServed')}</p>
              <p className="text-lg font-semibold">{stats.meals_served || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.overview')}
            </button>
            <button
              onClick={() => setActiveTab('verify')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'verify'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.verifyUsers')} ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('map')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'map'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.liveMap')}
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.analytics')}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.usersList')} ({allUsers.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.donationStats')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.total')}:</span>
                      <span className="font-semibold">{stats.donations?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.activeNow')}:</span>
                      <span className="font-semibold">{stats.donations?.active || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.completed')}:</span>
                      <span className="font-semibold">{stats.donations?.completed || 0}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.userStats')}</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.total')}:</span>
                      <span className="font-semibold">{stats.users?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.verified')}:</span>
                      <span className="font-semibold">{stats.users?.verified || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('dashboard.admin.pending')}:</span>
                      <span className="font-semibold">{stats.users?.pending || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">{t('dashboard.admin.recentActivity')}</h3>
                <div className="space-y-3">
                  {activeDonations.slice(0, 5).map((donation) => (
                    <div key={donation._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={donation.photo_url}
                          alt="Food"
                          className="w-10 h-10 rounded object-cover"
                        />
                        <div>
                          <p className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            By {donation.donor_id.organization_name}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                        {donation.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('dashboard.admin.pendingVerifications')}</h3>
              {pendingUsers.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('dashboard.admin.noPendingVerifications')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user._id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{user.organization_name}</h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              user.role === 'donor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <p><strong>{t('dashboard.admin.email')}:</strong> {user.email}</p>
                              <p><strong>{t('dashboard.admin.contact')}:</strong> {user.contact_person}</p>
                              <p><strong>{t('dashboard.admin.phone')}:</strong> {user.phone}</p>
                            </div>
                            <div>
                              <p><strong>{t('dashboard.admin.license')}:</strong> {user.license_number}</p>
                              <p><strong>{t('dashboard.admin.address')}:</strong> {user.address}</p>
                              <p><strong>{t('dashboard.admin.registered')}:</strong> {new Date(user.createdAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleVerifyUser(user._id, true)}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('dashboard.admin.approve')}
                          </button>
                          <button
                            onClick={() => handleVerifyUser(user._id, false)}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            {t('dashboard.admin.reject')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'map' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('dashboard.admin.liveDonationMap')}</h3>
              <div className="h-96 rounded-lg overflow-hidden">
                <MapContainer
                  center={[28.6139, 77.2090]} // Default to Delhi
                  zoom={10}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  />
                  {activeDonations.map((donation) => (
                    <Marker
                      key={donation._id}
                      position={[
                        donation.donor_id.location.coordinates[1],
                        donation.donor_id.location.coordinates[0]
                      ]}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </h4>
                          <p className="text-sm">
                            By {donation.donor_id.organization_name}
                          </p>
                          <p className="text-sm">
                            Serves {donation.quantity_serves} people
                          </p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${getStatusColor(donation.status)}`}>
                            {donation.status}
                          </span>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">{t('dashboard.admin.platformAnalytics')}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100">{t('dashboard.admin.totalImpact')}</p>
                      <p className="text-2xl font-bold">{stats.meals_served || 0}</p>
                      <p className="text-blue-100">{t('dashboard.admin.mealsServed')}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100">{t('dashboard.admin.successRate')}</p>
                      <p className="text-2xl font-bold">
                        {stats.donations?.total ? 
                          Math.round((stats.donations.completed / stats.donations.total) * 100) : 0}%
                      </p>
                      <p className="text-green-100">{t('dashboard.admin.completionRate')}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-green-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">{t('dashboard.admin.activeNow')}</p>
                      <p className="text-2xl font-bold">{stats.donations?.active || 0}</p>
                      <p className="text-purple-100">{t('dashboard.admin.liveDonations')}</p>
                    </div>
                    <MapPin className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h4 className="font-medium mb-4">{t('dashboard.admin.platformHealth')}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('dashboard.admin.userVerificationRate')}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.users?.total ? 
                            (stats.users.verified / stats.users.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.users?.verified || 0} {t('dashboard.admin.usersVerified').toLowerCase()}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600 mb-2">{t('dashboard.admin.donationSuccessRate')}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ 
                          width: `${stats.donations?.total ? 
                            (stats.donations.completed / stats.donations.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.donations?.completed || 0} {t('dashboard.admin.donationsCompleted').toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('dashboard.admin.allUsers')}</h3>
                <div className="text-sm text-gray-500">
                  {dataLoaded ? `${allUsers.length} ${t('dashboard.admin.usersFound')}` : t('dashboard.admin.loading')}
                </div>
              </div>
              {!dataLoaded ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">{t('dashboard.admin.loadingUsers')}</p>
                </div>
              ) : allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('dashboard.admin.noUsersFound')}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {t('dashboard.admin.noUsersDesc')}
                    <br />• {t('dashboard.admin.backendNotRunning')}
                    <br />• {t('dashboard.admin.noRegistrations')}
                    <br />• {t('dashboard.admin.dbIssue')}
                  </p>
                  <button
                    onClick={fetchData}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    {t('dashboard.admin.retryLoading')}
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.organization')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.role')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.contact')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.license')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.status')}</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.joined')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allUsers.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{user.organization_name}</div>
                              <div className="text-sm text-gray-500">{user.contact_person}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'donor' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.phone}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900 font-mono">{user.license_number}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.is_verified ? t('dashboard.admin.verified') : t('dashboard.admin.pending')}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;