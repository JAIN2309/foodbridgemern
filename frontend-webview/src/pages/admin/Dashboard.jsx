import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import {
  Users, CheckCircle, XCircle, MapPin, Clock, TrendingUp,
  Package, ShieldCheck, Utensils, AlertCircle, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import DonationCard from '../../components/common/DonationCard';
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
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [donationHistory, setDonationHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState({});
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  const [historyPagination, setHistoryPagination] = useState({ total: 0, pages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit] = useState(10);
  const [usersPagination, setUsersPagination] = useState({ total: 0, pages: 1 });
  const [usersLoading, setUsersLoading] = useState(false);

  const VALID_TABS = ['overview', 'verify', 'map', 'analytics', 'users', 'history'];
  const [confirmDialog, setConfirmDialog] = useState({ open: false, userId: null, approved: null, userName: '' });

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (tabParam && !VALID_TABS.includes(tabParam)) {
      setActiveTab('overview');
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
  }, [location.search, roleFilter]);

  const checkBackendHealth = async () => {
    try {
      const response = await api.get('/users/health');
      console.log('Backend health check:', response.data);
    } catch (error) {
      console.error('Backend health check failed:', error);
    }
  };

  const fetchUsersPage = async (page, role = roleFilter, search = searchQuery) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: usersLimit, role });
      if (search) params.set('search', search);
      const res = await api.get(`/users/all?${params}`);
      setAllUsers(res.data?.users || []);
      setUsersPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Users fetch error:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersPage(usersPage);
  }, [usersPage]);

  useEffect(() => {
    setUsersPage(1);
    fetchUsersPage(1, roleFilter, searchQuery);
  }, [roleFilter, searchQuery]);

  const fetchHistoryPage = async (page) => {
    setHistoryLoading(true);
    try {
      const res = await api.get(`/donations/admin/history?page=${page}&limit=${historyLimit}`);
      setDonationHistory(res.data?.donations || []);
      setHistoryPagination(res.data?.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (historyPage > 1) fetchHistoryPage(historyPage);
  }, [historyPage]);

  const fetchData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      console.log('Fetching admin data...');
      const [pendingRes, statsRes, donationsRes, usersRes, historyRes] = await Promise.all([
        api.get('/users/pending'),
        api.get('/users/stats'),
        api.get('/users/donations/all'),
        api.get(`/users/all?page=1&limit=${usersLimit}&role=${roleFilter}`),
        api.get(`/donations/admin/history?page=1&limit=${historyLimit}`)
      ]);
      
      console.log('API responses:', {
        pending: pendingRes.data,
        stats: statsRes.data,
        donations: donationsRes.data,
        users: usersRes.data,
        history: historyRes.data
      });
      
      setPendingUsers(pendingRes.data || []);
      setStats(statsRes.data || {});
      setActiveDonations(donationsRes.data || []);
      setAllUsers(usersRes.data?.users || []);
      setUsersPagination(usersRes.data?.pagination || { total: 0, pages: 1 });
      setUsersPage(1);
      setDonationHistory(historyRes.data?.donations || []);
      setHistoryStats(historyRes.data?.statistics || {});
      setHistoryPagination(historyRes.data?.pagination || { total: 0, pages: 1 });
      setHistoryPage(1);
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

  const openConfirm = (userId, approved, userName) =>
    setConfirmDialog({ open: true, userId, approved, userName });

  const closeConfirm = () =>
    setConfirmDialog({ open: false, userId: null, approved: null, userName: '' });

  const handleVerifyUser = async () => {
    const { userId, approved } = confirmDialog;
    closeConfirm();
    setIsLoading(true);
    try {
      await api.put(`/users/${userId}/verify`, { approved });
      toast.success(approved ? t('dashboard.admin.approveSuccess') : t('dashboard.admin.rejectSuccess'));
      fetchData();
    } catch (error) {
      toast.error(t('dashboard.admin.verifyFailed'));
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
    <>
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
              {t('dashboard.admin.usersList')} ({usersPagination.total})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.admin.history')} ({donationHistory.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {!VALID_TABS.includes(activeTab) && setActiveTab('overview')}
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
                            By {donation.donor_id?.organization_name || 'Unknown'}
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
                            onClick={() => openConfirm(user._id, true, user.organization_name)}
                            disabled={isLoading}
                            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {t('dashboard.admin.approve')}
                          </button>
                          <button
                            onClick={() => openConfirm(user._id, false, user.organization_name)}
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
                        donation.donor_id?.location?.coordinates?.[1] || 0,
                        donation.donor_id?.location?.coordinates?.[0] || 0
                      ]}
                    >
                      <Popup>
                        <div className="p-2">
                          <h4 className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </h4>
                          <p className="text-sm">
                            By {donation.donor_id?.organization_name || 'Unknown'}
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

              {/* Key metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <p className="text-xs text-blue-600 font-medium">{t('dashboard.admin.totalDonations')}</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{stats.donations?.total ?? 0}</p>
                  <p className="text-xs text-blue-400 mt-1">{stats.donations?.active ?? 0} {t('dashboard.admin.activeNow').toLowerCase()}</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Utensils className="w-4 h-4 text-green-600" />
                    <p className="text-xs text-green-600 font-medium">{t('dashboard.admin.mealsServed')}</p>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{stats.meals_served ?? 0}</p>
                  <p className="text-xs text-green-400 mt-1">{stats.meals_pending ?? 0} pending</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <p className="text-xs text-purple-600 font-medium">{t('dashboard.admin.completionRate')}</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-700">{stats.donations?.completion_rate ?? 0}%</p>
                  <p className="text-xs text-purple-400 mt-1">{stats.donations?.completed ?? 0} {t('dashboard.admin.completed').toLowerCase()}</p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <p className="text-xs text-orange-600 font-medium">{t('dashboard.admin.verificationRate')}</p>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">{stats.users?.verification_rate ?? 0}%</p>
                  <p className="text-xs text-orange-400 mt-1">{stats.users?.verified ?? 0} / {stats.users?.total ?? 0} users</p>
                </div>
              </div>

              {/* Donation status breakdown */}
              <div className="bg-gray-50 rounded-lg p-5">
                <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> {t('dashboard.admin.donationBreakdown')}
                </h4>
                {(() => {
                  const items = [
                    { label: t('dashboard.admin.active'),    value: stats.donations?.active    ?? 0, color: 'bg-blue-500' },
                    { label: t('dashboard.admin.reserved'),  value: stats.donations?.reserved  ?? 0, color: 'bg-yellow-500' },
                    { label: t('dashboard.admin.completed'), value: stats.donations?.completed ?? 0, color: 'bg-green-500' },
                    { label: t('dashboard.admin.expired'),   value: stats.donations?.expired   ?? 0, color: 'bg-red-400' },
                  ];
                  const total = stats.donations?.total || 1;
                  return (
                    <div className="space-y-3">
                      {items.map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{label}</span>
                            <span className="font-medium">{value} <span className="text-gray-400 font-normal">({Math.round((value / total) * 100)}%)</span></span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`${color} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.round((value / total) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* User breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> {t('dashboard.admin.userBreakdown')}
                  </h4>
                  <div className="space-y-3">
                    {[
                      { label: t('dashboard.admin.donorOnly'),  value: stats.users?.donors  ?? 0, color: 'bg-blue-500' },
                      { label: t('dashboard.admin.ngoOnly'),    value: stats.users?.ngos    ?? 0, color: 'bg-green-500' },
                      { label: t('dashboard.admin.pending'),    value: stats.users?.pending ?? 0, color: 'bg-yellow-400' },
                    ].map(({ label, value, color }) => {
                      const total = (stats.users?.total || 1);
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>{label}</span>
                            <span className="font-medium">{value}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div className={`${color} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${Math.round((value / total) * 100)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {t('dashboard.admin.platformHealth')}
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{t('dashboard.admin.donationSuccessRate')}</span>
                        <span className="font-semibold text-green-600">{stats.donations?.completion_rate ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${stats.donations?.completion_rate ?? 0}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{t('dashboard.admin.userVerificationRate')}</span>
                        <span className="font-semibold text-blue-600">{stats.users?.verification_rate ?? 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${stats.users?.verification_rate ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="text-lg font-medium">{t('dashboard.admin.allUsers')}</h3>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder={t('dashboard.admin.searchUsers')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
                  />
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">{t('dashboard.admin.allRoles')}</option>
                    <option value="donor">{t('dashboard.admin.donorOnly')}</option>
                    <option value="ngo">{t('dashboard.admin.ngoOnly')}</option>
                    <option value="admin">{t('dashboard.admin.adminOnly')}</option>
                  </select>
                  <div className="text-sm text-gray-500 whitespace-nowrap">
                    {dataLoaded ? `${usersPagination.total} ${t('dashboard.admin.usersFound')}` : t('dashboard.admin.loading')}
                  </div>
                </div>
              </div>
              {!dataLoaded || usersLoading ? (
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
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('dashboard.admin.lastLogin')}</th>
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
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleString()
                              : <span className="text-gray-300 italic">Never</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Users pagination */}
                  {usersPagination.pages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        {t('dashboard.admin.page')} {usersPage} {t('dashboard.admin.of')} {usersPagination.pages}
                        &nbsp;·&nbsp; {usersPagination.total} {t('dashboard.admin.total').toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                          disabled={usersPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          ← {t('dashboard.admin.prev')}
                        </button>
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, usersPagination.pages) }, (_, i) => {
                            let p;
                            if (usersPagination.pages <= 5) p = i + 1;
                            else if (usersPage <= 3) p = i + 1;
                            else if (usersPage >= usersPagination.pages - 2) p = usersPagination.pages - 4 + i;
                            else p = usersPage - 2 + i;
                            return (
                              <button
                                key={p}
                                onClick={() => setUsersPage(p)}
                                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                                  p === usersPage
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => setUsersPage(p => Math.min(usersPagination.pages, p + 1))}
                          disabled={usersPage === usersPagination.pages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          {t('dashboard.admin.next')} →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {t('dashboard.admin.history')}
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    ({historyPagination.total} {t('dashboard.admin.total').toLowerCase()})
                  </span>
                </h3>
              </div>

              {historyLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                  <p className="text-gray-400 mt-2 text-sm">{t('dashboard.admin.loading')}</p>
                </div>
              ) : donationHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">{t('dashboard.admin.noDonationHistory')}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {donationHistory.map((donation) => (
                      <DonationCard
                        key={donation._id}
                        donation={donation}
                        showDonor={true}
                        showNGO={true}
                      />
                    ))}
                  </div>

                  {/* Pagination controls */}
                  {historyPagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        {t('dashboard.admin.page')} {historyPage} {t('dashboard.admin.of')} {historyPagination.pages}
                        &nbsp;·&nbsp; {historyPagination.total} {t('dashboard.admin.total').toLowerCase()}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          ← {t('dashboard.admin.prev')}
                        </button>

                        {/* Page number pills */}
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(5, historyPagination.pages) }, (_, i) => {
                            let p;
                            if (historyPagination.pages <= 5) {
                              p = i + 1;
                            } else if (historyPage <= 3) {
                              p = i + 1;
                            } else if (historyPage >= historyPagination.pages - 2) {
                              p = historyPagination.pages - 4 + i;
                            } else {
                              p = historyPage - 2 + i;
                            }
                            return (
                              <button
                                key={p}
                                onClick={() => setHistoryPage(p)}
                                className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                                  p === historyPage
                                    ? 'bg-blue-600 text-white font-semibold'
                                    : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}
                          disabled={historyPage === historyPagination.pages}
                          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                          {t('dashboard.admin.next')} →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Confirmation Dialog */}
    {confirmDialog.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={closeConfirm}
        />

        {/* Dialog */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
            confirmDialog.approved ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {confirmDialog.approved
              ? <CheckCircle className="w-7 h-7 text-green-600" />
              : <XCircle className="w-7 h-7 text-red-600" />
            }
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            {confirmDialog.approved
              ? t('dashboard.admin.confirmApproveTitle')
              : t('dashboard.admin.confirmRejectTitle')
            }
          </h3>

          {/* Message */}
          <p className="text-sm text-gray-600 text-center mb-1">
            {confirmDialog.approved
              ? t('dashboard.admin.confirmApproveMsg')
              : t('dashboard.admin.confirmRejectMsg')
            }
          </p>
          <p className="text-sm font-semibold text-gray-800 text-center mb-6">
            "{confirmDialog.userName}"
          </p>

          {!confirmDialog.approved && (
            <p className="text-xs text-red-500 text-center mb-4 bg-red-50 rounded-lg px-3 py-2">
              {t('dashboard.admin.confirmRejectWarning')}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={closeConfirm}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {t('dashboard.admin.cancel')}
            </button>
            <button
              onClick={handleVerifyUser}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors ${
                confirmDialog.approved
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {confirmDialog.approved
                ? t('dashboard.admin.confirmApprove')
                : t('dashboard.admin.confirmReject')
              }
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdminDashboard;