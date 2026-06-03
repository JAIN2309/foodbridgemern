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
  const [pickupModal, setPickupModal] = useState({
    open: false, donationId: null, donationName: '',
    pickupWindowEnd: null, pickupType: 'instant', scheduledTime: '', error: ''
  });
  const [releaseModal, setReleaseModal] = useState({ open: false, donationId: null });
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseCustom, setReleaseCustom] = useState('');

  const RELEASE_REASONS = [
    t('dashboard.ngo.releaseReasonDistance'),
    t('dashboard.ngo.releaseReasonTransport'),
    t('dashboard.ngo.releaseReasonFoodGone'),
    t('dashboard.ngo.releaseReasonEmergency'),
    t('dashboard.ngo.releaseReasonOther'),
  ];

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(['feed', 'history'].includes(tabParam) ? tabParam : 'feed');
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
    // Map sidebar action values to valid NGO tab names
    const resolveTab = (val) => {
      if (val === 'feed' || val === 'history') return val;
      return 'feed'; // 'overview', 'dashboard' etc. → default to live feed
    };

    const handleTabChange = (event) => setActiveTab(resolveTab(event.detail));
    const handleForceUpdate = (event) => setActiveTab(resolveTab(event.detail));
    
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

  const openPickupModal = (donation) => setPickupModal({
    open: true,
    donationId: donation._id,
    donationName: donation.food_items?.map(i => i.name).join(', ') || '',
    pickupWindowEnd: donation.pickup_window_end,
    pickupType: 'instant',
    scheduledTime: '',
    error: ''
  });

  const closePickupModal = () => setPickupModal(p => ({ ...p, open: false, error: '' }));

  const handleConfirmPickup = async () => {
    const { donationId, pickupType, scheduledTime, pickupWindowEnd } = pickupModal;
    if (pickupType === 'scheduled') {
      if (!scheduledTime) {
        setPickupModal(p => ({ ...p, error: t('dashboard.ngo.pickupMustSelectTime') }));
        return;
      }
      const st = new Date(scheduledTime);
      if (st <= new Date()) {
        setPickupModal(p => ({ ...p, error: t('dashboard.ngo.pickupMustBeFuture') }));
        return;
      }
      if (pickupWindowEnd && st > new Date(pickupWindowEnd)) {
        setPickupModal(p => ({ ...p, error: t('dashboard.ngo.pickupMustBeBeforeEnd') }));
        return;
      }
    }
    closePickupModal();
    try {
      await dispatch(claimDonation({
        donationId,
        pickup_type: pickupType,
        scheduled_pickup_time: pickupType === 'scheduled' && scheduledTime ? new Date(scheduledTime).toISOString() : undefined
      })).unwrap();
      toast.success(t('dashboard.ngo.claimSuccess'));
      setActiveTab('history'); // switch to My Claims so NGO sees their reservation
      const coords = geoLocation || { latitude: 28.6139, longitude: 77.2090 };
      dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: 10000 }));
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
      default: return 'bg-gray-100 text-gray-800 dark:text-gray-100';
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.ngo.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.ngo.subtitle')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('dashboard.ngo.autoRefresh')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.ngo.availableNearby')}</p>
              <p className="text-lg font-semibold">{stats.available}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.ngo.claimed')}</p>
              <p className="text-lg font-semibold">{stats.claimed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.ngo.completed')}</p>
              <p className="text-lg font-semibold">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.ngo.peopleFed')}</p>
              <p className="text-lg font-semibold">{stats.totalServed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('feed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'feed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.ngo.liveFeed')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                      <p className="text-gray-500 dark:text-gray-400">{t('dashboard.ngo.noDonationsNearby')}</p>
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
                        <div key={donation._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
                          <div className="flex gap-4">
                            {/* Image */}
                            {donation.photo_url && !donation.photo_url.includes('placeholder') ? (
                              <img
                                src={donation.photo_url}
                                alt="Food"
                                className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {(!donation.photo_url || donation.photo_url.includes('placeholder')) && (
                              <div className="w-24 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex flex-col items-center justify-center border border-gray-200">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs text-gray-400 mt-1">No Photo</span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Title row */}
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <h4 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                                  {donation.food_items.map(item => item.name).join(', ')}
                                </h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${getStatusColor(donation.status)}`}>
                                  {t(`dashboard.donor.${donation.status}`)}
                                </span>
                              </div>

                              {/* Donor + category row */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {t('dashboard.ngo.by')} <span className="font-medium text-gray-800 dark:text-gray-100">{donation.donor_id?.organization_name}</span>
                                </span>
                                {donation.donor_id?.trust_score != null && (
                                  <span className="flex items-center gap-0.5 text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                    ★ {donation.donor_id.trust_score}
                                  </span>
                                )}
                                {donation.food_items?.[0]?.category && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    donation.food_items[0].category === 'vegetarian' ? 'bg-green-100 text-green-700' :
                                    donation.food_items[0].category === 'vegan' ? 'bg-emerald-100 text-emerald-700' :
                                    donation.food_items[0].category === 'non-vegetarian' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {t(`donationDetails.${donation.food_items[0].category}`)}
                                  </span>
                                )}
                              </div>

                              {/* Stats row */}
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  {donation.quantity_serves} {t('dashboard.donor.people')}
                                </span>
                                {donation.weight_kg > 0 && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                                    {donation.weight_kg} kg
                                  </span>
                                )}
                                {donation.food_items?.[0]?.storage_conditions && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                    {t(`donationDetails.${donation.food_items[0].storage_conditions}`) || donation.food_items[0].storage_conditions}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                                  <span className="text-orange-600 font-medium">{formatTimeRemaining(donation.pickup_window_end)}</span>
                                </span>
                              </div>

                              {/* Address + phone */}
                              <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {donation.pickup_address}
                                </span>
                                {donation.donor_id?.phone && (
                                  <a href={`tel:+91${donation.donor_id.phone}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                    +91 {donation.donor_id.phone}
                                  </a>
                                )}
                              </div>

                              {/* Posted on */}
                              {donation.createdAt && (
                                <div className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full mb-2">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                  {t('donationDetails.postedOn')} {new Date(donation.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}

                              {donation.special_instructions && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1 mb-2">
                                  💬 {donation.special_instructions}
                                </p>
                              )}

                              {/* Claim button */}
                              <button
                                onClick={() => openPickupModal(donation)}
                                disabled={isLoading}
                                className="w-full mt-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-semibold transition-colors"
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
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  Serves {donation.quantity_serves} people
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {donation.donor_id.organization_name}
                                </p>
                                <button
                                  onClick={() => openPickupModal(donation)}
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
                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.ngo.noClaimedDonations')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userDonations.map((donation) => (
                    <div key={donation._id} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                      <div className="flex gap-4">

                        {/* Image */}
                        {donation.photo_url && !donation.photo_url.includes('placeholder') ? (
                          <img
                            src={donation.photo_url}
                            alt="Food"
                            className="w-24 h-24 rounded-xl object-cover flex-shrink-0"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        {(!donation.photo_url || donation.photo_url.includes('placeholder')) && (
                          <div className="w-24 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex flex-col items-center justify-center border border-gray-200">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-400 mt-1">No Photo</span>
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          {/* Title + status */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-base leading-tight">
                              {donation.food_items.map(item => item.name).join(', ')}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 font-semibold ${getStatusColor(donation.status)}`}>
                              {t(`dashboard.donor.${donation.status}`)}
                            </span>
                          </div>

                          {/* Donor + category */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {t('dashboard.ngo.from')} <span className="font-medium text-gray-800 dark:text-gray-100">{donation.donor_id?.organization_name}</span>
                            </span>
                            {donation.donor_id?.trust_score != null && (
                              <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">★ {donation.donor_id.trust_score}</span>
                            )}
                            {donation.food_items?.[0]?.category && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                donation.food_items[0].category === 'vegetarian' ? 'bg-green-100 text-green-700' :
                                donation.food_items[0].category === 'vegan' ? 'bg-emerald-100 text-emerald-700' :
                                donation.food_items[0].category === 'non-vegetarian' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600 dark:text-gray-400'
                              }`}>
                                {t(`donationDetails.${donation.food_items[0].category}`)}
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mb-2">
                            <span className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5" />
                              {donation.quantity_serves} {t('dashboard.donor.people')}
                            </span>
                            {donation.weight_kg > 0 && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>
                                {donation.weight_kg} kg
                                {donation.status === 'collected' && <span className="text-emerald-600 font-medium"> {t('donationDetails.kgSaved')}</span>}
                              </span>
                            )}
                            {donation.food_items?.[0]?.storage_conditions && (
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                                {t(`donationDetails.${donation.food_items[0].storage_conditions}`) || donation.food_items[0].storage_conditions}
                              </span>
                            )}
                            {donation.createdAt && (
                              <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                {t('donationDetails.postedOn')} {new Date(donation.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {t('dashboard.ngo.claimedOn')} {new Date(donation.claimed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {/* Pickup deadline badge for reserved donations */}
                            {donation.status === 'reserved' && donation.pickup_deadline && (
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                                new Date(donation.pickup_deadline) > new Date()
                                  ? (donation.pickup_type === 'scheduled' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-green-50 border-green-200 text-green-700')
                                  : 'bg-red-50 border-red-200 text-red-700'
                              }`}>
                                {donation.pickup_type === 'scheduled' ? '📅' : '⚡'}
                                {donation.pickup_type === 'scheduled' && donation.scheduled_pickup_time
                                  ? `${t('dashboard.ngo.scheduledFor')} ${new Date(donation.scheduled_pickup_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                  : `${t('dashboard.ngo.pickupBy')} ${new Date(donation.pickup_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                                }
                              </span>
                            )}
                          </div>

                          {/* Pickup address */}
                          {donation.pickup_address && (
                            <div className="flex items-start gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{donation.pickup_address}</span>
                            </div>
                          )}

                          {/* Pickup window */}
                          {donation.pickup_window_start && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                              <span>
                                {new Date(donation.pickup_window_start).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                {' — '}
                                {new Date(donation.pickup_window_end).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}

                          {/* Donor contact */}
                          {donation.donor_id?.phone && (
                            <a href={`tel:+91${donation.donor_id.phone}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline mb-2">
                              <Phone className="w-3.5 h-3.5" />
                              +91 {donation.donor_id.phone}
                              {donation.donor_id?.contact_person && (
                                <span className="text-gray-400 ml-1">({donation.donor_id.contact_person})</span>
                              )}
                            </a>
                          )}

                          {/* Special instructions */}
                          {donation.special_instructions && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1 mb-3">
                              💬 {donation.special_instructions}
                            </p>
                          )}

                          {/* Action buttons for reserved donations */}
                          {donation.status === 'reserved' && (
                            <div className="flex gap-2 mt-1">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.post(`/donations/${donation._id}/collect`);
                                    toast.success(t('dashboard.ngo.markedCollected'));
                                    dispatch(fetchNGOHistory());
                                    if (geoLocation) dispatch(fetchNearbyDonations({ longitude: geoLocation.longitude, latitude: geoLocation.latitude, maxDistance: 10000 }));
                                  } catch {
                                    toast.error(t('dashboard.ngo.collectFailed'));
                                  }
                                }}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                              >
                                ✅ {t('dashboard.ngo.markCollected')}
                              </button>
                              <button
                                onClick={() => { setReleaseReason(''); setReleaseCustom(''); setReleaseModal({ open: true, donationId: donation._id }); }}
                                className="flex-1 px-3 py-2 bg-orange-500 dark:bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                              >
                                🔄 {t('dashboard.ngo.releaseDonation')}
                              </button>
                            </div>
                          )}

                          {/* Previous release reasons — compact pill tags */}
                          {donation.release_history?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t('dashboard.ngo.releaseHistoryTitle')}
                              </p>
                            <div className="flex flex-wrap gap-1.5">
                              {donation.release_history.map((r, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-xs bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300 rounded-full px-2.5 py-1 font-medium leading-none"
                                  title={r.reason}
                                >
                                  <svg className="w-3 h-3 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                  <span className="max-w-[140px] truncate">{r.reason}</span>
                                  {r.released_at && (
                                    <span className="text-orange-400 dark:text-orange-500 font-normal ml-0.5 whitespace-nowrap">
                                      · {new Date(r.released_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                            </div>
                          )}

                          {/* Collected banner */}
                          {donation.status === 'collected' && (
                            <div className="mt-1 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              <span className="text-sm font-medium text-emerald-700">{t('dashboard.ngo.collectedOn')} {new Date(donation.collected_at || donation.claimed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                        </div>
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

    {/* Release Reason Modal */}
    {releaseModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReleaseModal({ open: false, donationId: null })} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">
            {t('dashboard.ngo.releaseModalTitle')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            {t('dashboard.ngo.releaseModalSubtitle')}
          </p>

          {/* Reason options */}
          <div className="space-y-2 mb-4">
            {RELEASE_REASONS.map((reason, i) => (
              <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                releaseReason === reason
                  ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'
              }`}>
                <input
                  type="radio"
                  name="releaseReason"
                  value={reason}
                  checked={releaseReason === reason}
                  onChange={() => setReleaseReason(reason)}
                  className="accent-orange-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
              </label>
            ))}
          </div>

          {/* Custom reason if "Other" selected */}
          {releaseReason === t('dashboard.ngo.releaseReasonOther') && (
            <textarea
              value={releaseCustom}
              onChange={e => setReleaseCustom(e.target.value)}
              placeholder={t('dashboard.ngo.releaseCustomPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm mb-4 focus:outline-none focus:border-orange-400 resize-none"
            />
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setReleaseModal({ open: false, donationId: null })}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('layout.cancel')}
            </button>
            <button
              disabled={!releaseReason}
              onClick={async () => {
                const finalReason = releaseReason === t('dashboard.ngo.releaseReasonOther')
                  ? (releaseCustom.trim() || t('dashboard.ngo.releaseReasonOther'))
                  : releaseReason;
                try {
                  await api.post(`/donations/${releaseModal.donationId}/release`, { reason: finalReason });
                  toast.success(t('dashboard.ngo.releaseSuccess'));
                  setReleaseModal({ open: false, donationId: null });
                  dispatch(fetchNGOHistory());
                  if (geoLocation) dispatch(fetchNearbyDonations({ longitude: geoLocation.longitude, latitude: geoLocation.latitude, maxDistance: 10000 }));
                } catch {
                  toast.error(t('dashboard.ngo.releaseFailed'));
                }
              }}
              className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t('dashboard.ngo.confirmReleaseBtn')}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Pickup Schedule Modal */}
    {pickupModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closePickupModal} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">
            {t('dashboard.ngo.pickupModalTitle')}
          </h3>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center mb-4 truncate px-2">
            "{pickupModal.donationName}"
          </p>

          <div className="space-y-3 mb-4">
            {/* Instant option */}
            <button
              onClick={() => setPickupModal(p => ({ ...p, pickupType: 'instant', error: '' }))}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                pickupModal.pickupType === 'instant'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                  pickupModal.pickupType === 'instant' ? 'bg-green-100' : 'bg-gray-100 dark:bg-gray-700'
                }`}>⚡</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('dashboard.ngo.pickupInstantLabel')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.ngo.pickupInstantDesc')}</p>
                </div>
                {pickupModal.pickupType === 'instant' && (
                  <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {pickupModal.pickupType === 'instant' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1.5 mt-2">
                  ⚠️ {t('dashboard.ngo.pickupInstantWarning')}
                </p>
              )}
            </button>

            {/* Scheduled option */}
            <button
              onClick={() => setPickupModal(p => ({ ...p, pickupType: 'scheduled', error: '' }))}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                pickupModal.pickupType === 'scheduled'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                  pickupModal.pickupType === 'scheduled' ? 'bg-blue-100' : 'bg-gray-100 dark:bg-gray-700'
                }`}>📅</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('dashboard.ngo.pickupScheduleLabel')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('dashboard.ngo.pickupScheduleDesc')}</p>
                </div>
                {pickupModal.pickupType === 'scheduled' && (
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {pickupModal.pickupType === 'scheduled' && (
                <div className="mt-3" onClick={e => e.stopPropagation()}>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 block mb-1.5">
                    {t('dashboard.ngo.pickupScheduleTime')}
                    {pickupModal.pickupWindowEnd && (
                      <span className="text-gray-400 font-normal ml-1">
                        (max: {new Date(pickupModal.pickupWindowEnd).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                      </span>
                    )}
                  </label>
                  <input
                    type="datetime-local"
                    value={pickupModal.scheduledTime}
                    min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
                    max={pickupModal.pickupWindowEnd ? new Date(pickupModal.pickupWindowEnd).toISOString().slice(0, 16) : undefined}
                    onChange={e => setPickupModal(p => ({ ...p, scheduledTime: e.target.value, error: '' }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
              )}
            </button>
          </div>

          {pickupModal.error && (
            <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-3 text-center">
              {pickupModal.error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={closePickupModal}
              className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('layout.cancel')}
            </button>
            <button
              onClick={handleConfirmPickup}
              className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-colors ${
                pickupModal.pickupType === 'scheduled' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {t('dashboard.ngo.confirmPickupBtn')}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default NGODashboard;