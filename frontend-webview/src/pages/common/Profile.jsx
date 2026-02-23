import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Save, ArrowLeft } from 'lucide-react';
import { updateProfile } from '../../store/slices/authSlice';

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      contact_person: user?.contact_person || '',
      email: user?.email || '',
      phone: user?.phone || ''
    }
  });

  const onSubmit = async (data) => {
    try {
      await dispatch(updateProfile(data)).unwrap();
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      toast.error(error || 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    reset({
      contact_person: user?.contact_person || '',
      email: user?.email || '',
      phone: user?.phone || ''
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600">Manage your account information</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Personal Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Contact Person */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('contact_person', { required: 'Name is required' })}
                type="text"
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.contact_person ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.contact_person && (
              <p className="mt-1 text-sm text-red-600">{errors.contact_person.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.email ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('phone', { 
                  required: 'Phone number is required',
                  pattern: {
                    value: /^(\+91)?[6-9]\d{9}$/,
                    message: 'Invalid phone number format (10 digits or +91XXXXXXXXXX)'
                  }
                })}
                type="tel"
                disabled={!isEditing}
                placeholder="8849096411 or +918849096411"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Organization</p>
            <p className="font-medium">{user?.organization_name}</p>
          </div>
          <div>
            <p className="text-gray-600">Role</p>
            <p className="font-medium capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-gray-600">License Number</p>
            <p className="font-medium">{user?.license_number}</p>
          </div>
          <div>
            <p className="text-gray-600">Verification Status</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {user?.is_verified ? 'Verified' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;