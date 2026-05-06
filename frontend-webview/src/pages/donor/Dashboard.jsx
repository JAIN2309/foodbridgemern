import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { createDonation, fetchDonorHistory } from '../../store/slices/donationSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import BiometricGuard from '../../components/common/BiometricGuard';

const DonorDashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { userDonations, isLoading } = useSelector((state) => state.donations);
  const { location: geoLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState('overview');
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

  const [dataFetched, setDataFetched] = useState(false);

  // Manual data fetching only when needed
  const fetchData = () => {
    if (!dataFetched && !isLoading) {
      dispatch(fetchDonorHistory());
      setDataFetched(true);
    }
  };

  // Check URL parameters for tab on mount
  React.useLayoutEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
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
      setActiveTab('overview');
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

  return (
    <div className="space-y-6">
      {/* Image Modal */}
      {imageModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={closeImageModal}
        >
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: '80vw', height: '80vh', maxWidth: '1200px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 via-black/60 to-transparent p-6 z-10">
              {imageModal.title && (
                <h3 className="text-white text-2xl font-bold drop-shadow-lg pr-16">
                  {imageModal.title}
                </h3>
              )}
              <button
                onClick={closeImageModal}
                className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full text-white transition-all shadow-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image Container */}
            <div className="w-full h-full flex items-center justify-center p-8">
              <img
                src={imageModal.imageUrl}
                alt="Food donation"
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ maxHeight: 'calc(80vh - 4rem)' }}
              />
            </div>

            {/* Footer Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-6">
              <p className="text-white text-base font-medium text-center drop-shadow-lg">
                Click outside or press ESC to close
              </p>
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
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.donor.overview')}
            </button>
            <button
              onClick={() => setActiveTab('post')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'post'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {t('dashboard.donor.postFood')}
            </button>
            <button
              onClick={() => setActiveTab('history')}
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
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('dashboard.donor.noDonations')}</p>
                  {!dataFetched && (
                    <button
                      onClick={fetchData}
                      className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
                    >
                      {t('dashboard.donor.loadData')}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('post')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('dashboard.donor.postFood')}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDonations.slice(0, 5).map((donation) => (
                    <div key={donation._id} className="flex items-start justify-between p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4 flex-1">
                        <img
                          src={donation.photo_url}
                          alt="Food"
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openImageModal(donation.photo_url, donation.food_items.map(item => item.name).join(', '))}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/80x80?text=Food';
                          }}
                        />
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
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {new Date(donation.createdAt).toLocaleDateString()}
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
                <div className="space-y-3">
                  {userDonations.map((donation) => (
                    <div key={donation._id} className="flex items-start justify-between p-4 border dark:border-gray-700 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-start space-x-4 flex-1">
                        <img
                          src={donation.photo_url}
                          alt="Food"
                          className="w-24 h-24 rounded-lg object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openImageModal(donation.photo_url, donation.food_items.map(item => item.name).join(', '))}
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/96x96?text=Food';
                          }}
                        />
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
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {t('dashboard.donor.posted')}: {new Date(donation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(donation.status)}`}>
                          {t(`dashboard.donor.${donation.status}`)}
                        </span>
                        {donation.claimed_by && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {t('dashboard.donor.claimedBy')}: {donation.claimed_by.organization_name}
                          </p>
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

export default DonorDashboard;