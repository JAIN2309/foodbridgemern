import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Clock, MapPin, Users } from 'lucide-react';
import { createDonation, fetchDonorHistory } from '../../store/slices/donationSlice';
import { useGeolocation } from '../../hooks/useGeolocation';

const DonorDashboard = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const { userDonations, isLoading } = useSelector((state) => state.donations);
  const { location: geoLocation } = useGeolocation();
  const [activeTab, setActiveTab] = useState('overview');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    // Check URL parameters for tab
    const urlParams = new URLSearchParams(location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
    
    dispatch(fetchDonorHistory());
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchDonorHistory());
    }, 30000);
    
    // Listen for sidebar navigation events
    const handleTabChange = (event) => {
      console.log('Tab change event received:', event.detail);
      setActiveTab(event.detail);
    };
    
    const handleForceUpdate = (event) => {
      console.log('Force update event received:', event.detail);
      setActiveTab(event.detail);
    };
    
    window.addEventListener('dashboardTabChange', handleTabChange);
    window.addEventListener('forceTabUpdate', handleForceUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('dashboardTabChange', handleTabChange);
      window.removeEventListener('forceTabUpdate', handleForceUpdate);
    };
  }, [dispatch, location.search]);

  const onSubmit = async (data) => {
    if (!geoLocation) {
      toast.error('Location access is required');
      return;
    }

    const donationData = {
      ...data,
      coordinates: [geoLocation.longitude, geoLocation.latitude],
      food_items: data.food_items.split(',').map(item => ({
        name: item.trim(),
        category: data.food_category
      })),
      photo_url: 'https://via.placeholder.com/400x300', // Placeholder for now
    };

    try {
      await dispatch(createDonation(donationData)).unwrap();
      toast.success('Food donation posted successfully!');
      reset();
      setActiveTab('overview');
    } catch (error) {
      toast.error(error || 'Failed to post donation');
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
        <h1 className="text-2xl font-bold text-gray-900">Donor Dashboard</h1>
        <p className="text-gray-600">Manage your food donations and help reduce waste</p>
        <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 30 seconds</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-600">Total Donations</p>
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
              <p className="text-sm text-gray-600">Active</p>
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
              <p className="text-sm text-gray-600">Completed</p>
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
              <p className="text-sm text-gray-600">People Served</p>
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

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Recent Donations</h3>
              {userDonations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No donations yet. Start by posting your first donation!</p>
                  <button
                    onClick={() => setActiveTab('post')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium">Post New Food Donation</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Food Items</label>
                  <input
                    {...register('food_items', { required: 'Food items are required' })}
                    type="text"
                    placeholder="e.g., Rice, Dal, Vegetables (comma separated)"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  {errors.food_items && (
                    <p className="mt-1 text-sm text-red-600">{errors.food_items.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Food Category</label>
                  <select
                    {...register('food_category', { required: 'Category is required' })}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
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
                  <label className="block text-sm font-medium text-gray-700">Quantity (Serves)</label>
                  <input
                    {...register('quantity_serves', { 
                      required: 'Quantity is required',
                      min: { value: 1, message: 'Minimum 1 person' }
                    })}
                    type="number"
                    min="1"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  {errors.quantity_serves && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity_serves.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pickup Address</label>
                  <input
                    {...register('pickup_address', { required: 'Pickup address is required' })}
                    type="text"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  {errors.pickup_address && (
                    <p className="mt-1 text-sm text-red-600">{errors.pickup_address.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pickup Start Time</label>
                  <input
                    {...register('pickup_window_start', { required: 'Start time is required' })}
                    type="datetime-local"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onFocus={(e) => { e.stopPropagation(); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  {errors.pickup_window_start && (
                    <p className="mt-1 text-sm text-red-600">{errors.pickup_window_start.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Pickup End Time</label>
                  <input
                    {...register('pickup_window_end', { required: 'End time is required' })}
                    type="datetime-local"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                    onFocus={(e) => { e.stopPropagation(); }}
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  {errors.pickup_window_end && (
                    <p className="mt-1 text-sm text-red-600">{errors.pickup_window_end.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Special Instructions</label>
                <textarea
                  {...register('special_instructions')}
                  rows="3"
                  placeholder="Any special handling instructions..."
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoading ? 'Posting...' : 'Post Food Donation'}
              </button>
            </form>
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