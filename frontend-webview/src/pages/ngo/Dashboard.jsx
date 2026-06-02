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
                              <div className="w-24 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center border border-gray-200">
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
                                <h4 className="font-semibold text-gray-900 text-base leading-tight">
                                  {donation.food_items.map(item => item.name).join(', ')}
                                </h4>
                                <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${getStatusColor(donation.status)}`}>
                                  {t(`dashboard.donor.${donation.status}`)}
                                </span>
                              </div>

                              {/* Donor + category row */}
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-sm text-gray-600">
                                  {t('dashboard.ngo.by')} <span className="font-medium text-gray-800">{donation.donor_id?.organization_name}</span>
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
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {t(`donationDetails.${donation.food_items[0].category}`)}
                                  </span>
                                )}
                              </div>

                              {/* Stats row */}
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
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
                              <div className="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
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
                                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mb-2">
                                  💬 {donation.special_instructions}
                                </p>
                              )}

                              {/* Claim button */}
                              <button
                                onClick={() => openClaimConfirm(donation._id, donation.food_items?.map(i => i.name).join(', ') || '')}
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
                <div className="space-y-4">
                  {userDonations.map((donation) => (
                    <div key={donation._id} className="border border-gray-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
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
                          <div className="w-24 h-24 rounded-xl flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center border border-gray-200">
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
                            <h4 className="font-semibold text-gray-900 text-base leading-tight">
                              {donation.food_items.map(item => item.name).join(', ')}
                            </h4>
                            <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 font-semibold ${getStatusColor(donation.status)}`}>
                              {t(`dashboard.donor.${donation.status}`)}
                            </span>
                          </div>

                          {/* Donor + category */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="text-sm text-gray-600">
                              {t('dashboard.ngo.from')} <span className="font-medium text-gray-800">{donation.donor_id?.organization_name}</span>
                            </span>
                            {donation.donor_id?.trust_score != null && (
                              <span className="text-xs text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">★ {donation.donor_id.trust_score}</span>
                            )}
                            {donation.food_items?.[0]?.category && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                donation.food_items[0].category === 'vegetarian' ? 'bg-green-100 text-green-700' :
                                donation.food_items[0].category === 'vegan' ? 'bg-emerald-100 text-emerald-700' :
                                donation.food_items[0].category === 'non-vegetarian' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {t(`donationDetails.${donation.food_items[0].category}`)}
                              </span>
                            )}
                          </div>

                          {/* Stats row */}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
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
                          </div>

                          {/* Pickup address */}
                          {donation.pickup_address && (
                            <div className="flex items-start gap-1 text-sm text-gray-500 mb-2">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                              <span>{donation.pickup_address}</span>
                            </div>
                          )}

                          {/* Pickup window */}
                          {donation.pickup_window_start && (
                            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
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
                            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2 py-1 mb-3">
                              💬 {donation.special_instructions}
                            </p>
                          )}

                          {/* Mark Collected button */}
                          {donation.status === 'reserved' && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/donations/${donation._id}/collect`);
                                  toast.success(t('dashboard.ngo.markedCollected'));
                                  dispatch(fetchNGOHistory());
                                } catch {
                                  toast.error(t('dashboard.ngo.collectFailed'));
                                }
                              }}
                              className="w-full mt-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                              ✅ {t('dashboard.ngo.markCollected')}
                            </button>
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