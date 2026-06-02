import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { createDonation, fetchDonorHistory } from '../../store/slices/donationSlice';
import socketService from '../../services/socket';
import { useGeolocation } from '../../hooks/useGeolocation';
import BiometricGuard from '../../components/common/BiometricGuard';
import DonationCard from '../../components/common/DonationCard';

const DonorDashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { userDonations, isLoading } = useSelector((state) => state.donations);
  const { location: geoLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState(() => {
    // Restore tab from localStorage or default to 'overview'
    return localStorage.getItem('donorDashboardTab') || 'overview';
  });
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      pickup_window_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16),
      pickup_window_end: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
      expiry_date: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16)
    }
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [imageModal, setImageModal] = useState({ isOpen: false, imageUrl: null, title: '' });
  const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const [dataFetched, setDataFetched] = useState(false);

  // Initial fetch
  useEffect(() => {
    dispatch(fetchDonorHistory());
  }, [dispatch]);

  // Auto-refresh every 30 seconds — keeps status in sync
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(fetchDonorHistory());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  // Socket: refresh immediately when any NGO claims or collects a donation
  useEffect(() => {
    socketService.onDonationClaimed(() => {
      dispatch(fetchDonorHistory());
    });
    return () => socketService.offAllListeners();
  }, [dispatch]);

  // Check URL parameters for tab on mount
  React.useLayoutEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
      localStorage.setItem('donorDashboardTab', tabParam);
    }
    
    // Listen for sidebar navigation events
    const handleTabChange = (event) => {
      setActiveTab(event.detail);
      localStorage.setItem('donorDashboardTab', event.detail);
    };
    
    const handleForceUpdate = (event) => {
      setActiveTab(event.detail);
      localStorage.setItem('donorDashboardTab', event.detail);
    };
    
    window.addEventListener('dashboardTabChange', handleTabChange);
    window.addEventListener('forceTabUpdate', handleForceUpdate);
    
    return () => {
      window.removeEventListener('dashboardTabChange', handleTabChange);
      window.removeEventListener('forceTabUpdate', handleForceUpdate);
    };
  }, [location.search]);

  const onSubmit = async (data) => {
    if (!geoLocation) {
      toast.error('Location access is required');
      return;
    }

    // Validate date/time logic
    const startTime = new Date(data.pickup_window_start);
    const endTime = new Date(data.pickup_window_end);
    const expiryTime = new Date(data.expiry_date);
    const now = new Date();

    if (startTime <= now) {
      toast.error('Pickup start time must be in the future');
      return;
    }

    if (endTime <= startTime) {
      toast.error('Pickup end time must be after start time');
      return;
    }

    if (expiryTime <= endTime) {
      toast.error('Food expiry time must be after pickup end time');
      return;
    }

    // Check if biometric is enabled
    if (user?.biometric_enabled) {
      // Store form data and show biometric confirmation
      setPendingFormData(data);
      setShowBiometricConfirm(true);
      return;
    }

    // If biometric not enabled, proceed directly
    await submitDonation(data);
  };

  const submitDonation = async (data) => {
    // Create FormData for file upload
    const formData = new FormData();
    
    // Add photo if selected
    if (photoFile) {
      formData.append('photo', photoFile);
    }
    
    // Add other fields
    formData.append('coordinates', JSON.stringify([geoLocation.longitude, geoLocation.latitude]));
    formData.append('food_items', JSON.stringify(data.food_items.split(',').map(item => ({
      name: item.trim(),
      category: data.food_category,
      storage_conditions: data.storage_conditions,
      preparation_time: data.preparation_time,
      expiry_date: data.expiry_date
    }))));
    formData.append('quantity_serves', data.quantity_serves);
    formData.append('weight_kg', data.weight_kg);
    formData.append('pickup_address', data.pickup_address);
    formData.append('pickup_window_start', data.pickup_window_start);
    formData.append('pickup_window_end', data.pickup_window_end);
    formData.append('special_instructions', data.special_instructions || '');

    try {
      const result = await dispatch(createDonation(formData)).unwrap();
      toast.success('Food donation posted successfully!');
      reset();
      setPhotoPreview(null);
      setPhotoFile(null);
      setShowBiometricConfirm(false);
      setPendingFormData(null);
      
      // Refetch the donation history to ensure UI is updated
      await dispatch(fetchDonorHistory());
      
      setActiveTab('overview');
      localStorage.setItem('donorDashboardTab', 'overview');
    } catch (error) {
      console.error('Donation creation error:', error);
      toast.error(error?.message || error || 'Failed to post donation');
    }
  };

  const handleBiometricConfirm = async () => {
    try {
      // Authenticate with biometric
      const result = await window.navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required'
        }
      });

      if (result) {
        toast.success('Biometric authentication successful!');
        await submitDonation(pendingFormData);
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      toast.error('Biometric authentication failed. Please try again.');
      setShowBiometricConfirm(false);
    }
  };

  const handleBiometricCancel = () => {
    setShowBiometricConfirm(false);
    setPendingFormData(null);
    toast.info('Donation posting cancelled');
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const openImageModal = (imageUrl, title) => {
    setImageModal({ isOpen: true, imageUrl, title });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageUrl: null, title: '' });
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

  const stats = {
    total: userDonations.length,
    active: userDonations.filter(d => d.status === 'available').length,
    completed: userDonations.filter(d => d.status === 'collected').length,
    totalServed: userDonations
      .filter(d => d.status === 'collected')
      .reduce((sum, d) => sum + d.quantity_serves, 0)
  };

  const openDonationDetails = (donation) => {
    setSelectedDonation(donation);
    setDetailsModalVisible(true);
  };

  return (
    <div className="space-y-6">
      {/* Donation Details Bottom Sheet */}
      {detailsModalVisible && selectedDonation && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailsModalVisible(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ animation: 'slideUp 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-6 pb-8">
              {/* Header */}
              <div className="flex items-start gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                  style={{ backgroundColor: getStatusColor(selectedDonation.status).replace('bg-', '').replace('-100', '') === 'green' ? '#10b981' : getStatusColor(selectedDonation.status).replace('bg-', '').replace('-100', '') === 'yellow' ? '#f59e0b' : '#3b82f6' }}
                >
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedDonation.food_items.map(item => item.name).join(', ')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t('donationDetails.postedOn')} {new Date(selectedDonation.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button
                  onClick={() => setDetailsModalVisible(false)}
                  className="w-9 h-9 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6 ${getStatusColor(selectedDonation.status)} border`}>
                <div className="w-2 h-2 rounded-full bg-current" />
                <span className="text-sm font-bold capitalize">
                  {selectedDonation.status === 'available' ? t('donationDetails.availableForPickup') : 
                   selectedDonation.status === 'reserved' ? t('donationDetails.reservedByNGO') : 
                   t('donationDetails.successfullyCollected')}
                </span>
              </div>

              {/* Image */}
              <div className="mb-6">
                {selectedDonation.photo_url && !selectedDonation.photo_url.includes('placeholder') ? (
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-2xl" 
                    onClick={() => { 
                      setDetailsModalVisible(false); 
                      setTimeout(() => openImageModal(selectedDonation.photo_url, selectedDonation.food_items.map(item => item.name).join(', ')), 100); 
                    }}
                  >
                    <img
                      src={selectedDonation.photo_url}
                      alt="Food"
                      className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.classList.remove('group', 'cursor-pointer', 'overflow-hidden', 'rounded-2xl');
                        e.target.parentElement.className = 'w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex flex-col items-center justify-center';
                        e.target.parentElement.onclick = null;
                        e.target.parentElement.innerHTML = '<svg class="w-14 h-14 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><p class="text-gray-500 font-semibold text-sm">Image unavailable</p>';
                      }}
                    />
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300" />
                    {/* Expand Icon */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/70 group-hover:bg-black/90 text-white px-4 py-2 rounded-full text-xs font-semibold transition-all duration-300 shadow-lg">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      {t('imagePreview.clickToEnlarge')}
                    </div>
                    {/* Center Zoom Icon on Hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-2xl">
                        <svg className="w-8 h-8 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-2xl flex flex-col items-center justify-center">
                    <svg className="w-14 h-14 text-gray-400 dark:text-gray-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 font-semibold">{t('donationDetails.noPhotoAdded')}</p>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedDonation.quantity_serves}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{t('donationDetails.people')}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{selectedDonation.food_items[0]?.category?.split('-')[0] || 'Mixed'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{t('donationDetails.category')}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800 dark:to-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">{selectedDonation.food_items[0]?.storage_conditions?.split('_')[0] || 'Room'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{t('donationDetails.storage')}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-3 text-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-800 dark:to-yellow-900 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedDonation.quality_score?.toFixed(1) || 'N/A'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">{t('donationDetails.quality')}</p>
                </div>

                {selectedDonation.weight_kg > 0 && (
                  <div className={`rounded-xl p-3 text-center col-span-2 ${
                    selectedDonation.status === 'collected'
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'bg-gray-50 dark:bg-gray-700/30'
                  }`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-800 dark:to-emerald-900 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                      </svg>
                    </div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedDonation.weight_kg} kg</p>
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {selectedDonation.status === 'collected'
                        ? t('donationDetails.kgSaved')
                        : t('donationDetails.estimatedWeight')}
                    </p>
                  </div>
                )}
              </div>

              {/* Kg saved banner for collected donations */}
              {selectedDonation.status === 'collected' && selectedDonation.weight_kg > 0 && (
                <div className="mb-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">{selectedDonation.weight_kg} kg {t('donationDetails.kgSaved')}</p>
                    <p className="text-emerald-100 text-xs">{t('donationDetails.kgSavedDesc')}</p>
                  </div>
                </div>
              )}

              {/* Pickup Info */}
              <div className="mb-6">
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">{t('donationDetails.pickupInfo')}</h4>
                
                <div className="space-y-3">
                  <div className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('donationDetails.address')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedDonation.pickup_address}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('donationDetails.pickupWindow')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedDonation.pickup_window_start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {t('donationDetails.until')} {new Date(selectedDonation.pickup_window_end).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('donationDetails.expiryDate')}</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedDonation.food_items[0]?.expiry_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              {(selectedDonation.special_instructions || selectedDonation.claimed_by) && (
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mb-3">{t('donationDetails.additionalDetails')}</h4>
                  
                  <div className="space-y-3">
                    {selectedDonation.special_instructions && (
                      <div className="flex gap-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">{t('donationDetails.specialInstructions')}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedDonation.special_instructions}</p>
                        </div>
                      </div>
                    )}

                    {selectedDonation.claimed_by && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">{t('donationDetails.claimedBy')}</p>
                            <p className="text-base font-bold text-gray-900 dark:text-white">{selectedDonation.claimed_by?.organization_name}</p>
                          </div>
                          {/* Trust score badge */}
                          {selectedDonation.claimed_by?.trust_score != null && (
                            <div className="ml-auto flex items-center gap-1 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-700 rounded-lg px-2 py-1">
                              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{selectedDonation.claimed_by.trust_score}/100</span>
                            </div>
                          )}
                        </div>

                        {/* Contact details grid */}
                        <div className="grid grid-cols-1 gap-2">
                          {selectedDonation.claimed_by?.contact_person && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              <span className="font-medium">{selectedDonation.claimed_by.contact_person}</span>
                            </div>
                          )}
                          {selectedDonation.claimed_by?.phone && (
                            <a href={`tel:+91${selectedDonation.claimed_by.phone}`}
                              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              <span className="font-medium">+91 {selectedDonation.claimed_by.phone}</span>
                            </a>
                          )}
                          {selectedDonation.claimed_by?.email && (
                            <a href={`mailto:${selectedDonation.claimed_by.email}`}
                              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="font-medium">{selectedDonation.claimed_by.email}</span>
                            </a>
                          )}
                          {selectedDonation.claimed_by?.address && (
                            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{selectedDonation.claimed_by.address}</span>
                            </div>
                          )}
                          {selectedDonation.claimed_by?.ratings?.average > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span>{selectedDonation.claimed_by.ratings.average} / 5 ({selectedDonation.claimed_by.ratings.count} {t('donationDetails.reviews')})</span>
                            </div>
                          )}
                          {selectedDonation.claimed_by?.activity_stats?.successful_pickups > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{selectedDonation.claimed_by.activity_stats.successful_pickups} {t('donationDetails.successfulPickups')}</span>
                            </div>
                          )}
                          {selectedDonation.claimed_at && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 pt-1 border-t border-green-200 dark:border-green-800 mt-1">
                              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{t('donationDetails.claimedAt')} {new Date(selectedDonation.claimed_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={closeImageModal}
          onKeyDown={(e) => e.key === 'Escape' && closeImageModal()}
          tabIndex={-1}
        >
          <div 
            className="relative w-[95vw] h-[95vh] max-w-7xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={closeImageModal}
              className="absolute top-4 right-4 z-20 w-14 h-14 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full text-white transition-all shadow-2xl hover:scale-110 active:scale-95"
              aria-label="Close"
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title Overlay */}
            {imageModal.title && (
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-6 z-10 pointer-events-none">
                <h3 className="text-white text-3xl font-bold drop-shadow-2xl pr-20">
                  {imageModal.title}
                </h3>
              </div>
            )}

            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center p-4">
              <img
                src={imageModal.imageUrl}
                alt={imageModal.title || 'Food donation'}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                style={{ maxHeight: 'calc(95vh - 2rem)' }}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Found';
                }}
              />
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 pointer-events-none">
              <div className="flex items-center justify-center gap-3">
                <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-white/90 text-base font-semibold drop-shadow-lg">
                  {t('imagePreview.closeInstruction')}
                </p>
              </div>
            </div>

            {/* Zoom Indicator */}
            <div className="absolute top-20 left-6 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-sm pointer-events-none">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                {t('imagePreview.fullView')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.donor.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('dashboard.donor.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.donor.totalDonations')}</p>
              <p className="text-lg font-semibold dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.donor.active')}</p>
              <p className="text-lg font-semibold dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.donor.completed')}</p>
              <p className="text-lg font-semibold dark:text-white">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.donor.peopleServed')}</p>
              <p className="text-lg font-semibold dark:text-white">{stats.totalServed}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => {
                setActiveTab('overview');
                localStorage.setItem('donorDashboardTab', 'overview');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.donor.overview')}
            </button>
            <button
              onClick={() => {
                setActiveTab('post');
                localStorage.setItem('donorDashboardTab', 'post');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'post'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.donor.postFood')}
            </button>
            <button
              onClick={() => {
                setActiveTab('history');
                localStorage.setItem('donorDashboardTab', 'history');
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.donor.history')}
            </button>
          </nav>
        </div>

        <div className="p-6" onClick={(e) => e.stopPropagation()}>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium dark:text-white">{t('dashboard.donor.recentDonations')}</h3>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">Loading donations...</p>
                </div>
              ) : userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.donor.noDonations')}</p>
                  <button
                    onClick={() => {
                      setActiveTab('post');
                      localStorage.setItem('donorDashboardTab', 'post');
                    }}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('dashboard.donor.postFood')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDonations.slice(0, 5).map((donation) => (
                    <div 
                      key={donation._id} 
                      className="flex items-start justify-between p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => openDonationDetails(donation)}
                    >
                      <div className="flex items-start space-x-4 flex-1">
                        {donation.photo_url && !donation.photo_url.includes('placeholder') ? (
                          <img
                            src={donation.photo_url}
                            alt="Food"
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); openImageModal(donation.photo_url, donation.food_items.map(item => item.name).join(', ')); }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        {(!donation.photo_url || donation.photo_url.includes('placeholder')) && (
                          <div className="w-20 h-20 rounded-lg flex-shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex flex-col items-center justify-center border border-gray-200 dark:border-gray-600">
                            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs text-gray-400 mt-1">{t('donationDetails.noPhotoAdded')}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium dark:text-white text-lg">
                            {donation.food_items.map(item => item.name).join(', ')}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {t('dashboard.donor.serves')} {donation.quantity_serves} {t('dashboard.donor.people')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {donation.pickup_address}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(donation.status)}`}>
                          {t(`dashboard.donor.${donation.status}`)}
                        </span>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          {t('donationDetails.postedOn')} {new Date(donation.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'post' && (
            <div className="space-y-6">
              {/* Biometric Confirmation Modal */}
              {showBiometricConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6">
                    {/* Icon */}
                    <div className="flex justify-center">
                      <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {t('dashboard.donor.confirmDonation')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('dashboard.donor.confirmDonationMessage')}
                      </p>
                    </div>

                    {/* Donation Summary */}
                    {pendingFormData && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('dashboard.donor.foodItems')}:</span>
                          <span className="font-medium dark:text-white">{pendingFormData.food_items}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('dashboard.donor.serves')}:</span>
                          <span className="font-medium dark:text-white">{pendingFormData.quantity_serves} {t('dashboard.donor.people')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">{t('dashboard.donor.foodCategory')}:</span>
                          <span className="font-medium dark:text-white capitalize">{t(`dashboard.donor.${pendingFormData.food_category}`)}</span>
                        </div>
                      </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleBiometricCancel}
                        className="flex-1 py-3 px-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleBiometricConfirm}
                        className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                        {t('biometric.authenticate')}
                      </button>
                    </div>

                    {/* Info */}
                    <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                      🔒 {t('biometric.privacyNotice')}
                    </p>
                  </div>
                </div>
              )}

              <h3 className="text-lg font-medium dark:text-white">{t('dashboard.donor.postNewDonation')}</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" onClick={(e) => e.stopPropagation()}>
                {/* Photo Upload Section */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('dashboard.donor.foodPhoto')} (Optional)
                  </label>
                  
                  {!photoPreview ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                        <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Upload a photo of your food donation</p>
                      <label className="cursor-pointer px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                        Choose Photo
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Max size: 5MB (JPG, PNG, GIF, WebP)</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="Food preview"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.foodItems')} *</label>
                    <input
                      {...register('food_items', { required: 'Food items are required' })}
                      type="text"
                      placeholder={t('dashboard.donor.foodItemsPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.food_items && (
                      <p className="mt-1 text-sm text-red-600">{errors.food_items.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.foodCategory')} *</label>
                    <select
                      {...register('food_category', { required: 'Category is required' })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t('dashboard.donor.selectCategory')}</option>
                      <option value="vegetarian">{t('dashboard.donor.vegetarian')}</option>
                      <option value="non-vegetarian">{t('dashboard.donor.nonVegetarian')}</option>
                      <option value="vegan">{t('dashboard.donor.vegan')}</option>
                      <option value="mixed">{t('dashboard.donor.mixed')}</option>
                    </select>
                    {errors.food_category && (
                      <p className="mt-1 text-sm text-red-600">{errors.food_category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.quantity')} *</label>
                    <input
                      {...register('quantity_serves', {
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Minimum 1 person' },
                        max: { value: 1000, message: 'Maximum 1000 people' }
                      })}
                      type="number"
                      min="1"
                      max="1000"
                      placeholder={t('dashboard.donor.quantityPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.quantity_serves && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantity_serves.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.weightKg')} *</label>
                    <input
                      {...register('weight_kg', {
                        required: t('dashboard.donor.weightRequired'),
                        min: { value: 0.1, message: t('dashboard.donor.weightMin') },
                        max: { value: 5000, message: t('dashboard.donor.weightMax') }
                      })}
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="5000"
                      placeholder={t('dashboard.donor.weightPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.donor.weightHint')}</p>
                    {errors.weight_kg && (
                      <p className="mt-1 text-sm text-red-600">{errors.weight_kg.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.pickupAddress')} *</label>
                    <input
                      {...register('pickup_address', { required: 'Pickup address is required' })}
                      type="text"
                      placeholder={t('dashboard.donor.pickupAddressPlaceholder')}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.pickup_address && (
                      <p className="mt-1 text-sm text-red-600">{errors.pickup_address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.storageConditions')} *</label>
                    <select
                      {...register('storage_conditions', { required: 'Storage conditions are required' })}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t('dashboard.donor.selectStorage')}</option>
                      <option value="refrigerated">{t('dashboard.donor.refrigerated')}</option>
                      <option value="frozen">{t('dashboard.donor.frozen')}</option>
                      <option value="room_temperature">{t('dashboard.donor.roomTemperature')}</option>
                      <option value="hot_holding">{t('dashboard.donor.hotHolding')}</option>
                    </select>
                    {errors.storage_conditions && (
                      <p className="mt-1 text-sm text-red-600">{errors.storage_conditions.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.preparationTime')} *</label>
                    <input
                      {...register('preparation_time', { required: 'Preparation time is required' })}
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          setTimeout(() => e.target.blur(), 100);
                        }
                      }}
                    />
                    {errors.preparation_time && (
                      <p className="mt-1 text-sm text-red-600">{errors.preparation_time.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.pickupStart')} *</label>
                    <div className="relative">
                      <input
                        {...register('pickup_window_start', { 
                          required: 'Start time is required',
                          validate: (value) => {
                            const selectedDate = new Date(value);
                            const now = new Date();
                            const minTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
                            if (selectedDate < minTime) {
                              return `Start time must be at least 30 minutes from now (after ${minTime.toLocaleString()})`;
                            }
                            return true;
                          }
                        })}
                        type="datetime-local"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onChange={(e) => {
                          if (e.target.value) {
                            setTimeout(() => e.target.blur(), 100);
                          }
                        }}
                      />
                    </div>
                    {errors.pickup_window_start && (
                      <p className="mt-1 text-sm text-red-600">{errors.pickup_window_start.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.pickupEnd')} *</label>
                    <input
                      {...register('pickup_window_end', { 
                        required: 'End time is required',
                        validate: (value) => {
                          const startTime = document.querySelector('input[name="pickup_window_start"]')?.value;
                          if (startTime && new Date(value) <= new Date(startTime)) {
                            return 'End time must be at least 1 hour after start time';
                          }
                          const minDiff = 60 * 60 * 1000; // 1 hour
                          if (startTime && (new Date(value) - new Date(startTime)) < minDiff) {
                            return 'Pickup window must be at least 1 hour';
                          }
                          return true;
                        }
                      })}
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          setTimeout(() => e.target.blur(), 100);
                        }
                      }}
                    />
                    {errors.pickup_window_end && (
                      <p className="mt-1 text-sm text-red-600">{errors.pickup_window_end.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.expiryDate')} *</label>
                    <input
                      {...register('expiry_date', { 
                        required: 'Expiry date is required',
                        validate: (value) => {
                          const endTime = document.querySelector('input[name="pickup_window_end"]')?.value;
                          if (endTime && new Date(value) <= new Date(endTime)) {
                            return 'Expiry time must be at least 2 hours after pickup end time';
                          }
                          return true;
                        }
                      })}
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onChange={(e) => {
                        if (e.target.value) {
                          setTimeout(() => e.target.blur(), 100);
                        }
                      }}
                    />
                    {errors.expiry_date && (
                      <p className="mt-1 text-sm text-red-600">{errors.expiry_date.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('dashboard.donor.specialInstructions')}</label>
                  <textarea
                    {...register('special_instructions')}
                    rows="4"
                    placeholder={t('dashboard.donor.instructionsPlaceholder')}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setActiveTab('overview');
                      localStorage.setItem('donorDashboardTab', 'overview');
                    }}
                    className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    {t('dashboard.donor.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        {t('dashboard.donor.posting')}
                      </div>
                    ) : (
                      t('dashboard.donor.postDonation')
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium dark:text-white">{t('dashboard.donor.donationHistory')}</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.donor.noDonationHistory')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userDonations.map((donation) => (
                    <DonationCard
                      key={donation._id}
                      donation={donation}
                      showNGO={true}
                      onAction={openDonationDetails}
                    />
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

export default DonorDashboard;