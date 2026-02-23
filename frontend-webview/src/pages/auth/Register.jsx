import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, X, MapPin, Building, Users } from 'lucide-react';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { useGeolocation } from '../../hooks/useGeolocation';

const Register = () => {
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const { location, loading: locationLoading } = useGeolocation();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    special: false
  });
  
  const selectedRole = watch('role');
  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');
  const watchedPassword = watch('password');
  const watchedConfirmPassword = watch('confirmPassword');

  // Real-time password validation
  React.useEffect(() => {
    if (watchedPassword) {
      setPasswordValidation({
        length: watchedPassword.length >= 8 && watchedPassword.length <= 25,
        uppercase: /[A-Z]/.test(watchedPassword),
        lowercase: /[a-z]/.test(watchedPassword),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(watchedPassword)
      });
    }
  }, [watchedPassword]);

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) || 'Please enter a valid email address';
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone) || 'Please enter a valid 10-digit mobile number';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 25) return 'Password must not exceed 25 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
    return true;
  };

  const validateFSSAI = (license) => {
    // FSSAI License: 14-digit number starting with 1-9
    const fssaiRegex = /^[1-9][0-9]{13}$/;
    return fssaiRegex.test(license) || 'FSSAI License must be 14 digits starting with 1-9';
  };

  const validateNGO = (registration) => {
    // NGO Registration: Alphanumeric, 8-20 characters
    const ngoRegex = /^[A-Z0-9]{8,20}$/;
    return ngoRegex.test(registration.toUpperCase()) || 'NGO Registration must be 8-20 alphanumeric characters';
  };

  const onSubmit = async (data) => {
    if (!location) {
      toast.error('Location access is required');
      return;
    }

    const userData = {
      ...data,
      coordinates: [location.longitude, location.latitude]
    };

    try {
      await dispatch(registerUser(userData)).unwrap();
      toast.success('Registration successful! Please wait for admin approval.');
    } catch (error) {
      toast.error(error || 'Registration failed');
    }
  };

  React.useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const isEmailValid = watchedEmail ? validateEmail(watchedEmail) === true : null;
  const isPhoneValid = watchedPhone ? validatePhone(watchedPhone) === true : null;
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const watchedLicense = watch('license_number');
  const isLicenseValid = watchedLicense ? 
    (selectedRole === 'donor' ? validateFSSAI(watchedLicense) === true : validateNGO(watchedLicense) === true) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center mb-4">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Join FoodBridge</h2>
          <p className="text-gray-600">Help reduce food waste in your community</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Choose your role
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'donor', label: 'Food Donor', desc: 'Restaurant/Hotel', color: 'blue', icon: Building },
                    { value: 'ngo', label: 'NGO', desc: 'Food Receiver', color: 'green', icon: Users }
                  ].map((role) => (
                    <label key={role.value} className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      selectedRole === role.value 
                        ? (role.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50')
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        {...register('role', { required: 'Please select a role' })}
                        type="radio"
                        value={role.value}
                        className="sr-only"
                      />
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                        selectedRole === role.value 
                          ? (role.color === 'blue' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white')
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        <role.icon className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-base">{role.label}</div>
                        <div className="text-sm text-gray-500">{role.desc}</div>
                      </div>
                      {selectedRole === role.value && (
                        <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                          role.color === 'blue' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </label>
                  ))}
                </div>
                {errors.role && (
                  <p className="mt-2 text-sm text-red-600 flex items-center">
                    <X className="w-4 h-4 mr-1" />{errors.role.message}
                  </p>
                )}
              </div>

              {/* Organization Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {selectedRole === 'donor' ? 'Restaurant/Hotel Name' : 'NGO Name'}
                </label>
                <input
                  {...register('organization_name', { required: 'Organization name is required' })}
                  type="text"
                  placeholder={selectedRole === 'donor' ? 'Enter restaurant/hotel name' : 'Enter NGO name'}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                    errors.organization_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.organization_name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <X className="w-4 h-4 mr-1" />{errors.organization_name.message}
                  </p>
                )}
              </div>

              {/* Contact Person & Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Contact Person</label>
                  <input
                    {...register('contact_person', { required: 'Contact person is required' })}
                    type="text"
                    placeholder="Full name"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.contact_person ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {errors.contact_person && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" />{errors.contact_person.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <div className="flex">
                      <div className="flex items-center px-3 py-3 border-2 border-r-0 border-gray-200 rounded-l-xl bg-gray-50">
                        <span className="text-lg mr-2">🇮🇳</span>
                        <span className="text-sm font-medium text-gray-700">+91</span>
                      </div>
                      <input
                        {...register('phone', { 
                          required: 'Phone number is required',
                          validate: validatePhone
                        })}
                        type="tel"
                        placeholder="9876543210"
                        className={`flex-1 px-4 py-3 border-2 rounded-r-xl focus:outline-none transition-colors ${
                          errors.phone ? 'border-red-300 focus:border-red-500' :
                          isPhoneValid === true ? 'border-green-300 focus:border-green-500' :
                          isPhoneValid === false ? 'border-red-300 focus:border-red-500' :
                          'border-gray-200 focus:border-blue-500'
                        }`}
                      />
                      {watchedPhone && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          {isPhoneValid ? (
                            <Check className="w-5 h-5 text-green-500" />
                          ) : (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" />{errors.phone.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    {...register('email', { 
                      required: 'Email is required',
                      validate: validateEmail
                    })}
                    type="email"
                    placeholder="your@email.com"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.email ? 'border-red-300 focus:border-red-500' :
                      isEmailValid === true ? 'border-green-300 focus:border-green-500' :
                      isEmailValid === false ? 'border-red-300 focus:border-red-500' :
                      'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {watchedEmail && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isEmailValid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <X className="w-4 h-4 mr-1" />{errors.email.message}
                  </p>
                )}
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {selectedRole === 'donor' ? 'FSSAI License Number' : 'NGO Registration Number'}
                </label>
                <div className="relative">
                  <input
                    {...register('license_number', { 
                      required: 'License/Registration number is required',
                      validate: selectedRole === 'donor' ? validateFSSAI : validateNGO
                    })}
                    type="text"
                    placeholder={selectedRole === 'donor' ? '12345678901234 (14 digits)' : 'NGO123ABC456 (8-20 chars)'}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${
                      errors.license_number ? 'border-red-300 focus:border-red-500' :
                      isLicenseValid === true ? 'border-green-300 focus:border-green-500' :
                      isLicenseValid === false ? 'border-red-300 focus:border-red-500' :
                      'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {watchedLicense && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {isLicenseValid ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {selectedRole === 'donor' && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      <strong>FSSAI Format:</strong> 14-digit number (e.g., 12345678901234)
                    </p>
                  </div>
                )}
                {selectedRole === 'ngo' && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      <strong>NGO Format:</strong> 8-20 alphanumeric characters (e.g., NGO123ABC456)
                    </p>
                  </div>
                )}
                {errors.license_number && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <X className="w-4 h-4 mr-1" />{errors.license_number.message}
                  </p>
                )}
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                <textarea
                  {...register('address', { required: 'Address is required' })}
                  rows="3"
                  placeholder="Enter your complete address"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors resize-none ${
                    errors.address ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'
                  }`}
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <X className="w-4 h-4 mr-1" />{errors.address.message}
                  </p>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      {...register('password', { validate: validatePassword })}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create password"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none transition-colors ${
                        errors.password ? 'border-red-300 focus:border-red-500' :
                        isPasswordValid && watchedPassword ? 'border-green-300 focus:border-green-500' :
                        'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                        showPassword 
                          ? 'text-blue-600 hover:text-blue-700 scale-110' 
                          : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Eye className="w-5 h-5 hover:animate-bounce" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" />{errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: (value) => value === watchedPassword || 'Passwords do not match'
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password"
                      className={`w-full px-4 py-3 pr-12 border-2 rounded-xl focus:outline-none transition-colors ${
                        errors.confirmPassword ? 'border-red-300 focus:border-red-500' :
                        watchedConfirmPassword && watchedConfirmPassword === watchedPassword ? 'border-green-300 focus:border-green-500' :
                        'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                        showConfirmPassword 
                          ? 'text-blue-600 hover:text-blue-700 scale-110' 
                          : 'text-gray-300 hover:text-gray-500'
                      }`}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Eye className="w-5 h-5 hover:animate-bounce" />
                      )}
                    </button>
                    {watchedConfirmPassword && (
                      <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
                        {watchedConfirmPassword === watchedPassword ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <X className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <X className="w-4 h-4 mr-1" />{errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Requirements */}
              {watchedPassword && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'length', label: '8-25 characters' },
                      { key: 'uppercase', label: 'Uppercase letter' },
                      { key: 'lowercase', label: 'Lowercase letter' },
                      { key: 'special', label: 'Special character' }
                    ].map((req) => (
                      <div key={req.key} className="flex items-center text-xs">
                        {passwordValidation[req.key] ? (
                          <Check className="w-3 h-3 text-green-500 mr-1" />
                        ) : (
                          <X className="w-3 h-3 text-red-500 mr-1" />
                        )}
                        <span className={passwordValidation[req.key] ? 'text-green-700' : 'text-red-700'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Location Status */}
            <div className={`p-4 rounded-xl border-2 ${
              location ? 'border-green-200 bg-green-50' : 
              locationLoading ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'
            }`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {locationLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                  ) : location ? (
                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <MapPin className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    location ? 'text-green-700' : 
                    locationLoading ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {locationLoading ? 'Detecting your location...' : 
                     location ? 'Location detected successfully' : 
                     'Location access required for registration'}
                  </p>
                  {!location && !locationLoading && (
                    <p className="text-xs text-red-600 mt-1">
                      Please enable location access in your browser
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || locationLoading || !location}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <span className="text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                  Sign in here
                </Link>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;