import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { User, Mail, Phone, ArrowLeft, Building, MapPin, Edit3, Check, X, Camera, Trash2 } from 'lucide-react';
import { updateProfile } from '../../store/slices/authSlice';
import BiometricGuard from '../../components/common/BiometricGuard';

const Profile = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isLoading } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef(null);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      contact_person: user?.contact_person || '',
      email: user?.email || '',
      phone: user?.phone || '',
      organization_name: user?.organization_name || '',
      address: user?.address || ''
    }
  });

  useEffect(() => {
    if (user && !isEditing) {
      const defaultValues = {
        contact_person: user.contact_person || '',
        email: user.email || '',
        phone: user.phone || '',
        organization_name: user.organization_name || '',
        address: user.address || ''
      };
      reset(defaultValues);
      setProfilePicture(user.profile_picture || null);
    }
  }, [user?.id, reset]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 500KB)
    if (file.size > 500 * 1024) {
      toast.error('Image size should be less than 500KB');
      return;
    }

    setUploadingPicture(true);
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        
        // Double check base64 size
        if (base64String.length > 500000) {
          toast.error('Image too large after conversion. Please select a smaller image.');
          setUploadingPicture(false);
          return;
        }
        
        // Upload to backend
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users/profile-picture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ image: base64String })
        });

        if (!response.ok) {
          if (response.status === 413) {
            throw new Error('Image too large');
          }
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        setProfilePicture(data.profile_picture);
        toast.success('Profile picture updated successfully');
        setUploadingPicture(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(error.message || 'Failed to upload profile picture');
      setUploadingPicture(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!window.confirm('Are you sure you want to remove your profile picture?')) return;

    setUploadingPicture(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}/users/profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Delete failed');
      
      setProfilePicture(null);
      toast.success('Profile picture removed successfully');
    } catch (error) {
      toast.error('Failed to remove profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      await dispatch(updateProfile(data)).unwrap();
      toast.success(t('profile.profileUpdated'));
      setIsEditing(false);
    } catch (error) {
      toast.error(error || t('profile.updateFailed'));
    }
  };

  const handleCancel = () => {
    reset({
      contact_person: user?.contact_person || '',
      email: user?.email || '',
      phone: user?.phone || '',
      organization_name: user?.organization_name || '',
      address: user?.address || ''
    });
    setIsEditing(false);
  };

  return (
    <BiometricGuard screenName="Profile">
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
            <p className="text-gray-600">{t('profile.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">{t('profile.personalInfo')}</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              {t('profile.editProfile')}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.organizationName')}
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('organization_name', { required: t('profile.orgNameRequired') })}
                type="text"
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.organization_name ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.organization_name && (
              <p className="mt-1 text-sm text-red-600">{errors.organization_name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.contactPerson')}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('contact_person', { required: t('profile.nameRequired') })}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.emailAddress')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('email', { 
                  required: t('profile.emailRequired'),
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: t('profile.emailInvalid')
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.phoneNumber')}
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                {...register('phone', { 
                  required: t('profile.phoneRequired'),
                  pattern: {
                    value: /^[6-9]\d{9}$/,
                    message: t('profile.phoneInvalid')
                  }
                })}
                type="tel"
                disabled={!isEditing}
                placeholder="9876543210"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.phone ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profile.address')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                {...register('address', { required: t('profile.addressRequired') })}
                rows="3"
                disabled={!isEditing}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  !isEditing ? 'bg-gray-50 text-gray-600' : 'bg-white'
                } ${errors.address ? 'border-red-300' : 'border-gray-300'}`}
              />
            </div>
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4 mr-2" />
                {isLoading ? t('profile.saving') : t('profile.saveChanges')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                <X className="w-4 h-4 mr-2" />
                {t('profile.cancel')}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Profile Picture Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Picture</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border-4 border-gray-200">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-16 h-16 text-gray-400" />
              )}
            </div>
            {uploadingPicture && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-4">
              Upload a profile picture. Recommended size: 400x400px. Max size: 500KB.
            </p>
            <div className="flex gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPicture}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Camera className="w-4 h-4 mr-2" />
                {profilePicture ? 'Change Picture' : 'Upload Picture'}
              </button>
              {profilePicture && (
                <button
                  onClick={handleDeletePicture}
                  disabled={uploadingPicture}
                  className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('profile.accountInfo')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t('profile.organization')}</p>
            <p className="font-medium">{user?.organization_name}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('profile.role')}</p>
            <p className="font-medium capitalize">{user?.role}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('profile.licenseNumber')}</p>
            <p className="font-medium">{user?.license_number}</p>
          </div>
          <div>
            <p className="text-gray-600">{t('profile.verificationStatus')}</p>
            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
              user?.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {user?.is_verified ? t('profile.verified') : t('profile.pending')}
            </span>
          </div>
        </div>
      </div>
    </div>
    </BiometricGuard>
  );
};

export default Profile;