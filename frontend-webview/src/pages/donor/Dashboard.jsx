import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { createDonation, fetchDonorHistory } from '../../store/slices/donationSlice';
import { useGeolocation } from '../../hooks/useGeolocation';

const DonorDashboard = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { userDonations, isLoading } = useSelector((state) => state.donations);
  const { location: geoLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState('overview');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

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

    const donationData = {
      ...data,
      coordinates: [geoLocation.longitude, geoLocation.latitude],
      food_items: data.food_items.split(',').map(item => ({
        name: item.trim(),
        category: data.food_category,
        storage_conditions: data.storage_conditions,
        preparation_time: data.preparation_time,
        expiry_date: data.expiry_date
      })),
      photo_url: 'https://via.placeholder.com/400x300',
    };

    try {
      const result = await dispatch(createDonation(donationData)).unwrap();
      toast.success('Food donation posted successfully!');
      reset();
      setActiveTab('overview');
    } catch (error) {
      console.error('Donation creation error:', error);
      toast.error(error?.message || error || 'Failed to post donation');
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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.donor.title')}</h1>
        <p className="text-gray-600">{t('dashboard.donor.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.donor.totalDonations')}</p>
              <p className="text-lg font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.donor.active')}</p>
              <p className="text-lg font-semibold">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.donor.completed')}</p>
              <p className="text-lg font-semibold">{stats.completed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Users className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">{t('dashboard.donor.peopleServed')}</p>
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
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('post')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'post'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Post Food
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
          </nav>
        </div>

        <div className="p-6" onClick={(e) => e.stopPropagation()}>
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recent Donations</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No donations yet.</p>
                  {!dataFetched && (
                    <button
                      onClick={fetchData}
                      className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mr-2"
                    >
                      Load Data
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab('post')}
                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Post Food
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userDonations.slice(0, 5).map((donation) => (
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
                            Serves {donation.quantity_serves} people
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
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
              <h3 className="text-lg font-medium">Post New Food Donation</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" onClick={(e) => e.stopPropagation()}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Food Items *</label>
                    <input
                      {...register('food_items', { required: 'Food items are required' })}
                      type="text"
                      placeholder="e.g., Rice, Dal, Vegetables (comma separated)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.food_items && (
                      <p className="mt-1 text-sm text-red-600">{errors.food_items.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Food Category *</label>
                    <select
                      {...register('food_category', { required: 'Category is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="non-vegetarian">Non-Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="mixed">Mixed</option>
                    </select>
                    {errors.food_category && (
                      <p className="mt-1 text-sm text-red-600">{errors.food_category.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity (Serves) *</label>
                    <input
                      {...register('quantity_serves', { 
                        required: 'Quantity is required',
                        min: { value: 1, message: 'Minimum 1 person' },
                        max: { value: 1000, message: 'Maximum 1000 people' }
                      })}
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="Number of people this can serve"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.quantity_serves && (
                      <p className="mt-1 text-sm text-red-600">{errors.quantity_serves.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Address *</label>
                    <input
                      {...register('pickup_address', { required: 'Pickup address is required' })}
                      type="text"
                      placeholder="Complete pickup address"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {errors.pickup_address && (
                      <p className="mt-1 text-sm text-red-600">{errors.pickup_address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Storage Conditions *</label>
                    <select
                      {...register('storage_conditions', { required: 'Storage conditions are required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select storage conditions</option>
                      <option value="refrigerated">Refrigerated (0-4°C)</option>
                      <option value="frozen">Frozen (below -18°C)</option>
                      <option value="room_temperature">Room Temperature</option>
                      <option value="hot_holding">Hot Holding (above 60°C)</option>
                    </select>
                    {errors.storage_conditions && (
                      <p className="mt-1 text-sm text-red-600">{errors.storage_conditions.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preparation Time *</label>
                    <input
                      {...register('preparation_time', { required: 'Preparation time is required' })}
                      type="datetime-local"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pickup Start Date & Time *</label>
                    <div className="relative">
                      <input
                        {...register('pickup_window_start', { 
                          required: 'Start time is required',
                          validate: (value) => {
                            const selectedDate = new Date(value);
                            const now = new Date();
                            if (selectedDate <= now) {
                              return 'Start time must be in the future';
                            }
                            return true;
                          }
                        })}
                        type="datetime-local"
                        min={new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onBlur={(e) => {
                          if (e.target.value) {
                            e.target.blur();
                          }
                        }}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Pickup End Date & Time *</label>
                    <input
                      {...register('pickup_window_end', { 
                        required: 'End time is required',
                        validate: (value) => {
                          const startTime = document.querySelector('input[name="pickup_window_start"]')?.value;
                          if (startTime && new Date(value) <= new Date(startTime)) {
                            return 'End time must be after start time';
                          }
                          return true;
                        }
                      })}
                      type="datetime-local"
                      min={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Food Expiry Date & Time *</label>
                    <input
                      {...register('expiry_date', { 
                        required: 'Expiry date is required',
                        validate: (value) => {
                          const endTime = document.querySelector('input[name="pickup_window_end"]')?.value;
                          if (endTime && new Date(value) <= new Date(endTime)) {
                            return 'Expiry time must be after pickup end time';
                          }
                          return true;
                        }
                      })}
                      type="datetime-local"
                      min={new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions</label>
                  <textarea
                    {...register('special_instructions')}
                    rows="4"
                    placeholder="Any special handling instructions, dietary information, or pickup notes..."
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Posting...
                      </div>
                    ) : (
                      'Post Food Donation'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Donation History</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No donation history yet</p>
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
                            Serves {donation.quantity_serves} people
                          </p>
                          <p className="text-sm text-gray-600">
                            Posted: {new Date(donation.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(donation.status)}`}>
                          {donation.status}
                        </span>
                        {donation.claimed_by && (
                          <p className="text-sm text-gray-600 mt-1">
                            Claimed by: {donation.claimed_by.organization_name}
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