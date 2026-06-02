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
  const [claimConfirm, setClaimConfirm] = useState({ open: false, donationId: null, donationName: '' });

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    // Use location or fallback to Delhi coordinates
    const coords = geoLocation || { latitude: 28.6139, longitude: 77.2090 };

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
    }, 30000);
    
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

  const openClaimConfirm = (donationId, donationName) =>
    setClaimConfirm({ open: true, donationId, donationName });

  const closeClaimConfirm = () =>
    setClaimConfirm({ open: false, donationId: null, donationName: '' });

  const handleClaimDonation = async () => {
    const { donationId } = claimConfirm;
    closeClaimConfirm();
    try {
      await dispatch(claimDonation(donationId)).unwrap();
      toast.success(t('dashboard.ngo.claimSuccess'));
      if (geoLocation) {
        dispatch(fetchNearbyDonations({
          longitude: geoLocation.longitude,
          latitude: geoLocation.latitude,
          maxDistance: 10000
        }));
      }
      dispatch(fetchNGOHistory());
    } catch (error) {
      toast.error(error || t('dashboard.ngo.claimFailed'));
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
    <>
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
              <p className="text-sm text-gray-600">{t('dashboard.ngo.availableNearby')}</p>
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
              <p className="text-sm text-gray-600">{t('dashboard.ngo.claimed')}</p>
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
              <p className="text-sm text-gray-600">{t('dashboard.ngo.completed')}</p>
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
              <p className="text-sm text-gray-600">{t('dashboard.ngo.peopleFed')}</p>
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
              {t('dashboard.ngo.liveFeed')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('dashboard.ngo.myClaims')}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'feed' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{t('dashboard.ngo.availableDonations')}</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'
                    }`}
                  >
                    {t('dashboard.ngo.list')}
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`px-3 py-1 rounded ${
                      viewMode === 'map' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'
                    }`}
                  >
                    {t('dashboard.ngo.map')}
                  </button>
                </div>
              </div>

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {nearbyDonations.filter(d => d.status === 'available').length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">{t('dashboard.ngo.noDonationsNearby')}</p>
                      <button
                        onClick={() => {
                          const coords = geoLocation || { latitude: 28.6139, longitude: 77.2090 };
                          dispatch(fetchNearbyDonations({
                            longitude: coords.longitude,
                            latitude: coords.latitude,
                            maxDistance: 10000
                          }));
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        {t('dashboard.ngo.refreshDonations')}
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
                                  {t('dashboard.ngo.by')} {donation.donor_id.organization_name}
                                </p>
                                <div className="flex items-center space-x-4 text-sm text-gray-600">
                                  <span className="flex items-center">
                                    <Users className="w-4 h-4 mr-1" />
                                    {t('dashboard.ngo.serves')} {donation.quantity_serves}
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
                                    <strong>{t('dashboard.ngo.instructions')}:</strong> {donation.special_instructions}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                                {t(`dashboard.donor.${donation.status}`)}
                              </span>
                              <button
                                onClick={() => openClaimConfirm(donation._id, donation.food_items?.map(i => i.name).join(', ') || '')}
                                disabled={isLoading}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm"
                              >
                                {t('dashboard.ngo.claimFood')}
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
                                  onClick={() => openClaimConfirm(donation._id, donation.food_items?.map(i => i.name).join(', ') || '')}
                                  className="mt-2 px-3 py-1 bg-primary-600 text-white rounded text-sm"
                                >
                                  {t('dashboard.ngo.claimFood')}
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
              <h3 className="text-lg font-medium">{t('dashboard.ngo.claimedDonations')}</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">{t('dashboard.ngo.noClaimedDonations')}</p>
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
                            {t('dashboard.ngo.from')} {donation.donor_id.organization_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {t('dashboard.ngo.serves')} {donation.quantity_serves} {t('dashboard.donor.people')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                          {t(`dashboard.donor.${donation.status}`)}
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
                              {t('dashboard.ngo.markCollected')}
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

    {/* Claim Confirmation Dialog */}
    {claimConfirm.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeClaimConfirm} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          {/* Icon */}
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            {t('dashboard.ngo.confirmClaimTitle')}
          </h3>
          <p className="text-sm text-gray-600 text-center mb-1">
            {t('dashboard.ngo.confirmClaimMsg')}
          </p>
          <p className="text-sm font-semibold text-gray-800 text-center mb-3">
            "{claimConfirm.donationName}"
          </p>
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center mb-6">
            {t('dashboard.ngo.confirmClaimNote')}
          </p>

          <div className="flex gap-3">
            <button
              onClick={closeClaimConfirm}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {t('layout.cancel')}
            </button>
            <button
              onClick={handleClaimDonation}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              {t('dashboard.ngo.claimFood')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default NGODashboard;