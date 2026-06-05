import React, { useState, useEffect, useMemo } from 'react';
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
  markCollectedNGO,
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
  const { location: geoLocation, error: geoError, loading: geoLoading, retry: retryLocation } = useGeolocation();

  // Priority: live GPS → profile coords from registration → null (show prompt)
  const profileCoords = user?.location?.coordinates
    ? { longitude: user.location.coordinates[0], latitude: user.location.coordinates[1] }
    : null;
  const coords = geoLocation || profileCoords;
  const usingProfileFallback = !geoLocation && !!profileCoords;
  const [activeTab, setActiveTab] = useState('feed');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'map'
  const [filters, setFilters] = useState({
    search: '', category: 'all', radius: 10, minServes: '', sortBy: 'time_remaining'
  });
  const [pickupModal, setPickupModal] = useState({
    open: false, donationId: null, donationName: '',
    pickupWindowEnd: null, pickupType: 'instant', scheduledTime: '', error: ''
  });
  const [releaseModal, setReleaseModal] = useState({ open: false, donationId: null });
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseCustom, setReleaseCustom] = useState('');
  const [ratingModal, setRatingModal] = useState({ open: false, donationId: null, donationName: '' });
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingHover, setRatingHover] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingLoading, setRatingLoading] = useState(false);

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
    
    // Only fetch donations if we have real location — never fall back to hardcoded coords
    if (coords) {
      dispatch(fetchNearbyDonations({
        longitude: coords.longitude,
        latitude:  coords.latitude,
        maxDistance: filters.radius * 1000
      }));
    }
    dispatch(fetchNGOHistory());

    // Auto-refresh every 30 seconds — skip nearby if still no location
    const interval = setInterval(() => {
      if (coords) {
        dispatch(fetchNearbyDonations({
          longitude: coords.longitude,
          latitude:  coords.latitude,
          maxDistance: filters.radius * 1000
        }));
      }
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

  const openRatingModal = (donation) => {
    setRatingStars(0); setRatingHover(0); setRatingComment('');
    setRatingModal({ open: true, donationId: donation._id, donationName: donation.food_items?.map(i => i.name).join(', ') || '' });
  };

  const submitCollect = async (withRating) => {
    setRatingLoading(true);
    const { donationId } = ratingModal;
    setRatingModal(m => ({ ...m, open: false }));
    try {
      await dispatch(markCollectedNGO({
        donationId,
        ...(withRating && ratingStars > 0 ? { rating: ratingStars, review: ratingComment.trim() || undefined } : {})
      })).unwrap();
      toast.success(t('dashboard.ngo.markedCollected'));
      dispatch(fetchNGOHistory());
      if (coords) dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: filters.radius * 1000 }));
    } catch (err) {
      toast.error(err || t('dashboard.ngo.collectFailed'));
    } finally {
      setRatingLoading(false);
    }
  };

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
      if (coords) dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: filters.radius * 1000 }));
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

  // Re-fetch when radius changes — only if location is available
  useEffect(() => {
    if (coords) {
      dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: filters.radius * 1000 }));
    }
  }, [filters.radius, geoLocation]);

  const filteredFeed = useMemo(() => {
    let result = nearbyDonations.filter(d => d.status === 'available');
    const q = filters.search.trim().toLowerCase();
    if (q) result = result.filter(d =>
      d.food_items?.some(i => i.name.toLowerCase().includes(q)) ||
      d.donor_id?.organization_name?.toLowerCase().includes(q) ||
      d.pickup_address?.toLowerCase().includes(q)
    );
    if (filters.category !== 'all')
      result = result.filter(d => d.food_items?.some(i => i.category === filters.category));
    if (filters.minServes && parseInt(filters.minServes) > 0)
      result = result.filter(d => d.quantity_serves >= parseInt(filters.minServes));
    if (filters.sortBy === 'time_remaining')
      result = [...result].sort((a, b) => new Date(a.pickup_window_end) - new Date(b.pickup_window_end));
    else if (filters.sortBy === 'newest')
      result = [...result].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // 'distance' = default backend $near order, no re-sort needed
    return result;
  }, [nearbyDonations, filters]);

  const isFiltered = filters.search || filters.category !== 'all' || filters.radius !== 10 || filters.minServes || filters.sortBy !== 'time_remaining';

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

              {/* GPS unavailable but using profile coords — soft info banner */}
              {usingProfileFallback && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm">
                  <span className="text-blue-500">📍</span>
                  <span className="text-blue-700 dark:text-blue-300">{t('dashboard.ngo.usingProfileLocation')}</span>
                  <button onClick={retryLocation} className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold">{t('dashboard.ngo.enableGPS')}</button>
                </div>
              )}

              {/* No location at all — GPS and profile both missing */}
              {!coords && !geoLoading && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 text-center">
                  <div className="text-3xl mb-3">⚠️</div>
                  <h4 className="font-bold text-gray-800 dark:text-white mb-1">{t('dashboard.ngo.locationRequired')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{geoError || t('dashboard.ngo.locationRequiredDesc')}</p>
                  <button onClick={retryLocation} className="px-5 py-2 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors">
                    {t('dashboard.ngo.enableLocation')}
                  </button>
                </div>
              )}

              {/* Detecting GPS */}
              {!coords && geoLoading && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-2">📍</div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">{t('dashboard.ngo.locationDetecting')}</p>
                </div>
              )}

              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium">{t('dashboard.ngo.availableDonations')} <span className="text-sm font-normal text-gray-400">({filteredFeed.length})</span></h3>
                <div className="flex space-x-2">
                  <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'}`}>{t('dashboard.ngo.list')}</button>
                  <button onClick={() => setViewMode('map')} className={`px-3 py-1 rounded ${viewMode === 'map' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100'}`}>{t('dashboard.ngo.map')}</button>
                </div>
              </div>

              {/* ── Filter Bar ── */}
              <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-xl p-4 mb-4 space-y-3">

                {/* Row 1 — Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder={t('dashboard.ngo.searchPlaceholder')}
                    value={filters.search}
                    onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    className="w-full pl-9 pr-9 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                  />
                  {filters.search && (
                    <button onClick={() => setFilters(f => ({ ...f, search: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 flex items-center justify-center">
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>

                {/* Row 2 — Category */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{t('dashboard.ngo.category')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[['all','All'],['vegetarian','🥦 Vegetarian'],['non-vegetarian','🍗 Non-Veg'],['vegan','🌱 Vegan'],['mixed','🍱 Mixed']].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFilters(f => ({ ...f, category: val }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          filters.category === val
                            ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-300 hover:text-primary-600'
                        }`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Row 3 — Radius · Sort · Min Serves · Clear */}
                <div className="flex flex-wrap gap-4 items-end">
                  {/* Radius */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{t('dashboard.ngo.radius')}</p>
                    <div className="flex gap-1">
                      {[1,5,10].map(km => (
                        <button key={km} onClick={() => setFilters(f => ({ ...f, radius: km }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            filters.radius === km
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-300'
                          }`}>
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{t('dashboard.ngo.sortBy')}</p>
                    <div className="flex gap-1">
                      {[['time_remaining','⏱ Urgency'],['distance','📍 Distance'],['newest','🕐 Newest']].map(([val, lbl]) => (
                        <button key={val} onClick={() => setFilters(f => ({ ...f, sortBy: val }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            filters.sortBy === val
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-amber-300'
                          }`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Min Serves */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">{t('dashboard.ngo.minServes')}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="1"
                        placeholder={t('dashboard.ngo.any')}
                        value={filters.minServes}
                        onChange={e => setFilters(f => ({ ...f, minServes: e.target.value }))}
                        className="w-20 px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 dark:text-white rounded-lg focus:outline-none focus:border-blue-400"
                      />
                      <span className="text-xs text-gray-400">{t('dashboard.donor.people')}</span>
                    </div>
                  </div>

                  {/* Clear */}
                  {isFiltered && (
                    <button
                      onClick={() => setFilters({ search: '', category: 'all', radius: 10, minServes: '', sortBy: 'time_remaining' })}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 hover:bg-red-100 transition-colors">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      {t('dashboard.ngo.clearFilters')}
                    </button>
                  )}
                </div>
              </div>
              {/* ── End Filter Bar ── */}

              {viewMode === 'list' ? (
                <div className="space-y-3">
                  {filteredFeed.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500 dark:text-gray-400">
                        {isFiltered ? t('dashboard.ngo.noMatchFilters') : t('dashboard.ngo.noDonationsNearby')}
                      </p>
                      {isFiltered ? (
                        <button onClick={() => setFilters({ search: '', category: 'all', radius: 10, minServes: '', sortBy: 'time_remaining' })}
                          className="mt-3 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200">
                          {t('dashboard.ngo.clearFilters')}
                        </button>
                      ) : (
                        <button onClick={() => { if (coords) dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: filters.radius * 1000 })); }}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          {t('dashboard.ngo.refreshDonations')}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredFeed.map((donation) => (
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
                      center={[coords.latitude, coords.longitude]}
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
                                onClick={() => openRatingModal(donation)}
                                disabled={ratingLoading}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
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
                  if (coords) dispatch(fetchNearbyDonations({ longitude: coords.longitude, latitude: coords.latitude, maxDistance: 10000 }));
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

    {/* Rating Modal — opens when NGO clicks Mark Collected */}
    {ratingModal.open && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => submitCollect(false)} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-1">{t('dashboard.ngo.ratePickupTitle')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">{t('dashboard.ngo.ratePickupSubtitle')}</p>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 text-center mb-4 truncate px-2">"{ratingModal.donationName}"</p>

          {/* Stars — SVG cascade + spring animation */}
          <div className="flex justify-center gap-2 mb-2">
            {[1,2,3,4,5].map(star => {
              const active    = star <= (ratingHover || ratingStars);
              const isHover   = star === ratingHover;
              const isCascade = ratingHover > 0 && star < ratingHover;
              const isLocked  = star <= ratingStars && ratingHover === 0;
              const scale     = isHover ? 1.45 : isCascade ? 1.15 : 1;
              return (
                <button key={star} onMouseEnter={() => setRatingHover(star)}
                  onMouseLeave={() => setRatingHover(0)} onClick={() => setRatingStars(s => s === star ? 0 : star)}
                  className="focus:outline-none" style={{ lineHeight: 0 }}>
                  <svg width="42" height="42" viewBox="0 0 24 24" style={{
                    transform: `scale(${scale})`,
                    transition: 'transform 0.18s cubic-bezier(0.34,1.56,0.64,1)',
                    filter: isLocked ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.55))' : 'none',
                  }}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                      fill={active ? '#f59e0b' : '#e5e7eb'}
                      stroke={active ? '#d97706' : '#d1d5db'}
                      strokeWidth="1.5" strokeLinejoin="round"
                      style={{ transition: 'fill 0.12s ease, stroke 0.12s ease' }} />
                  </svg>
                </button>
              );
            })}
          </div>
          {/* Label — shows on hover AND on selection */}
          <div className="flex justify-center mb-4" style={{ minHeight: '26px' }}>
            {(ratingHover || ratingStars) > 0 && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                style={{ animation: 'fadeIn 0.15s ease' }}>
                {['','Poor quality','Below average','Good','Very good','Excellent!'][ratingHover || ratingStars]}
              </span>
            )}
          </div>

          {/* Comment — smooth entrance when stars selected */}
          <div style={{ maxHeight: ratingStars > 0 ? '120px' : '0px', overflow: 'hidden', transition: 'max-height 0.25s ease', marginBottom: ratingStars > 0 ? '16px' : '0px' }}>
            <textarea
              value={ratingComment}
              onChange={e => setRatingComment(e.target.value)}
              placeholder="Optional comment..."
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl text-sm focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Submit — full width primary button */}
          <button onClick={() => submitCollect(true)} disabled={ratingStars === 0}
            className="w-full py-3 mb-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm">
            {ratingStars > 0 ? t('dashboard.ngo.submitRating') : t('dashboard.ngo.selectStars')}
          </button>

          {/* Skip — plain text link, not competing with Submit */}
          <button onClick={() => submitCollect(false)}
            className="w-full py-1.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            {t('dashboard.ngo.skipRating')}
          </button>
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