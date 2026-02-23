import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { MapPin, Clock, Users, Phone } from 'lucide-react';
import { 
  fetchNearbyDonations, 
  claimDonation, 
  fetchNGOHistory,
  addNewDonation 
} from '../../store/slices/donationSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import socketService from '../../services/socket';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';

const NGODashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { nearbyDonations, userDonations, isLoading } = useSelector((state) => state.donations);
  const { location: geoLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState('feed');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    // Use location or fallback to Delhi coordinates
    const coords = geoLocation || { latitude: 28.6139, longitude: 77.2090 };
    console.log('NGO location:', coords);
    
    setDebugInfo({
      userLocation: geoLocation,
      fallbackUsed: !geoLocation,
      userVerified: user?.is_verified,
      userRole: user?.role
    });
    
    dispatch(fetchNearbyDonations({
      longitude: coords.longitude,
      latitude: coords.latitude,
      maxDistance: 10000
    }));
    
    dispatch(fetchNGOHistory());
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchNearbyDonations({
        longitude: coords.longitude,
        latitude: coords.latitude,
        maxDistance: 10000
      }));
      dispatch(fetchNGOHistory());
    }, 3000);
    
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
  }, [dispatch, geoLocation, user, location.search]);

  useEffect(() => {
    // Socket.io listeners for real-time updates
    socketService.onNewDonation((data) => {
      dispatch(addNewDonation(data.donation));
      toast.success('New food donation available nearby!');
    });

    return () => {
      socketService.offAllListeners();
    };
  }, [dispatch]);

  const handleClaimDonation = async (donationId) => {
    try {
      await dispatch(claimDonation(donationId)).unwrap();
      toast.success('Donation claimed successfully!');
    } catch (error) {
      toast.error(error || 'Failed to claim donation');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'collected': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endTime) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m left`;
  };

  const stats = {
    available: nearbyDonations.filter(d => d.status === 'available').length,
    claimed: userDonations.filter(d => d.status === 'reserved').length,
    completed: userDonations.filter(d => d.status === 'collected').length,
    totalServed: userDonations
      .filter(d => d.status === 'collected')
      .reduce((sum, d) => sum + d.quantity_serves, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.ngo.title')}</h1>
        <p className="text-gray-600">{t('dashboard.ngo.subtitle')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('dashboard.ngo.autoRefresh')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Available Nearby</p>
              <p className="text-lg font-semibold">{stats.available}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Claimed</p>
              <p className="text-lg font-semibold">{stats.claimed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-lg font-semibold">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">People Fed</p>
              <p className="text-lg font-semibold">{stats.totalServed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'feed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Live Feed
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Claims
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Available Food Donations</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'
                    }`}
                  >
                    List
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'map' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'
                    }`}
                  >
                    Map
                  </button>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {nearbyDonations.filter(d => d.status === 'available').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No food donations available nearby</p>
                      <div className="text-xs text-gray-400 mt-4 p-3 bg-gray-50 rounded">
                        <p><strong>Debug Info:</strong></p>
                        <p>Total donations: {nearbyDonations.length}</p>
                        <p>Available: {nearbyDonations.filter(d => d.status === 'available').length}</p>
                        <p>User verified: {debugInfo.userVerified ? 'Yes' : 'No'}</p>
                        <p>Location: {debugInfo.userLocation ? `${debugInfo.userLocation.latitude}, ${debugInfo.userLocation.longitude}` : 'Using fallback (Delhi)'}</p>
                        <p>Fallback used: {debugInfo.fallbackUsed ? 'Yes' : 'No'}</p>
                      </div>
                      <button
                        onClick={async () => {
                          const coords = geoLocation || { latitude: 28.6139, longitude: 77.2090 };
                          console.log('Manual refresh clicked with coords:', coords);
                          try {
                            const response = await api.get('/donations/nearby', {
                              params: {
                                longitude: coords.longitude,
                                latitude: coords.latitude,
                                maxDistance: 10000
                              }
                            });
                            console.log('Direct API call result:', response.data);
                          } catch (error) {
                            console.error('Direct API call error:', error.response?.data || error.message);
                          }
                          
                          dispatch(fetchNearbyDonations({
                            longitude: coords.longitude,
                            latitude: coords.latitude,
                            maxDistance: 10000
                          }));
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        Refresh Donations (Debug)
                      </button>
                    </div>
                  ) : (
                    nearbyDonations
                      .filter(d => d.status === 'available')
                      .map((donation) => (
                        <div key={donation._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex space-x-4">
                              <img
                                src={donation.photo_url}
                                alt="Food"
                                className="w-16 h-16 rounded-lg object-cover"
                              />
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">
                                  {donation.food_items.map(item => item.name).join(', ')}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  By {donation.donor_id.organization_name}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    Serves {donation.quantity_serves}
                                  </span>
                                  <span className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {formatTimeRemaining(donation.pickup_window_end)}
                                  </span>
                                  <span className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-1" />
                                    {donation.pickup_address}
                                  </span>
                                </div>
                                {donation.special_instructions && (
                                  <p className="text-sm text-gray-600 mt-2">
                                    <strong>Instructions:</strong> {donation.special_instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                                {donation.status}
                              </span>
                              <button
                                onClick={() => handleClaimDonation(donation._id)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                              >
                                Claim Food
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              ) : (
                <div className="h-96 rounded-lg overflow-hidden">
                  {geoLocation && (
                    <MapContainer
                      center={[geoLocation.latitude, geoLocation.longitude]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {nearbyDonations
                        .filter(d => d.status === 'available')
                        .map((donation) => (
                          <Marker
                            key={donation._id}
                            position={[
                              donation.location.coordinates[1],
                              donation.location.coordinates[0]
                            ]}
                          >
                            <Popup>
                              <div className="p-2">
                                <h4 className="font-medium">
                                  {donation.food_items.map(item => item.name).join(', ')}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Serves {donation.quantity_serves} people
                                </p>
                                <p className="text-sm text-gray-600">
                                  {donation.donor_id.organization_name}
                                </p>
                                <button
                                  onClick={() => handleClaimDonation(donation._id)}
                                  className="mt-2 px-3 py-1 bg-primary-600 text-white rounded text-sm"
                                >
                                  Claim
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                    </MapContainer>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">My Claimed Donations</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No claimed donations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDonations.map((donation) => (
                    <div key={donation._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={donation.photo_url}
                          alt="Food"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div>
                          <p className="font-medium">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            From {donation.donor_id.organization_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            Serves {donation.quantity_serves} people
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(donation.claimed_at).toLocaleDateString()}
                        </p>
                        {donation.status === 'reserved' && (
                          <div className="mt-2">
                            <div className="flex items-center text-sm text-gray-600 mb-2">
                              <Phone className="w-4 h-4 mr-1" />
                              {donation.donor_id.phone}
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/donations/${donation._id}/collect`);
                                  toast.success('Donation marked as collected!');
                                  dispatch(fetchNGOHistory());
                                } catch (error) {
                                  toast.error('Failed to mark as collected');
                                }
                              }}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                            >
                              Mark Collected
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NGODashboard;