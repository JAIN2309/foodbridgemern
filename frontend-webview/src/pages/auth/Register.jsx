import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, X, MapPin, Building, Users, Mail, Phone, Lock, Sparkles, FileText, Heart, TrendingUp, Shield, Award } from 'lucide-react';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { useGeolocation } from '../../hooks/useGeolocation';
import LanguageSelector from '../../components/common/LanguageSelector';

const Register = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const { location, loading: locationLoading } = useGeolocation();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isTyping, setIsTyping] = useState({});
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
    return emailRegex.test(email) || t('auth.register.emailInvalid');
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    return phoneRegex.test(phone) || t('auth.register.phoneInvalid');
  };

  const validatePassword = (password) => {
    if (!password) return t('auth.register.passwordRequired');
    if (password.length < 8) return t('auth.register.passwordMin');
    if (password.length > 25) return t('auth.register.passwordMax');
    if (!/[A-Z]/.test(password)) return t('auth.register.passwordUpper');
    if (!/[a-z]/.test(password)) return t('auth.register.passwordLower');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return t('auth.register.passwordSpecial');
    return true;
  };

  const validateFSSAI = (license) => {
    // FSSAI License: 14-digit number starting with 1-9
    const fssaiRegex = /^[1-9][0-9]{13}$/;
    return fssaiRegex.test(license) || t('auth.register.fssaiInvalid');
  };

  const validateNGO = (registration) => {
    // NGO Registration: Alphanumeric, 8-20 characters
    const ngoRegex = /^[A-Z0-9]{8,20}$/;
    return ngoRegex.test(registration.toUpperCase()) || t('auth.register.ngoInvalid');
  };

  const onSubmit = async (data) => {
    if (!location) {
      toast.error(t('auth.register.locationRequired'));
      return;
    }

    const userData = {
      ...data,
      coordinates: [location.longitude, location.latitude]
    };

    try {
      await dispatch(registerUser(userData)).unwrap();
      toast.success(t('auth.register.registerSuccess'));
    } catch (error) {
      toast.error(error || t('auth.register.registerFailed'));
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Brand Promotion Section */}
        <div className="hidden lg:block sticky top-8">
          <div className="space-y-6">
            {/* Brand Header */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <Building className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">FoodBridge</h1>
                  <p className="text-sm text-gray-600">{t('brand.tagline')}</p>
                </div>
              </div>
              <p className="text-lg text-gray-700 leading-relaxed">
                {t('brand.mission')}
              </p>
            </div>

            {/* Why Join Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" />
                {t('brand.whyJoin')}
              </h3>
              <div className="space-y-3">
                {[
                  { icon: Heart, text: t('brand.features.impact'), color: 'text-red-500' },
                  { icon: TrendingUp, text: t('brand.features.tracking'), color: 'text-green-500' },
                  { icon: Shield, text: t('brand.features.secure'), color: 'text-blue-500' },
                  { icon: Users, text: t('brand.features.network', { count: 500 }), color: 'text-purple-500' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Process Steps */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                {t('brand.howItWorks')}
              </h3>
              <div className="space-y-3">
                {[
                  { step: '1', text: t('brand.steps.register') },
                  { step: '2', text: t('brand.steps.post') },
                  { step: '3', text: t('brand.steps.track') },
                  { step: '4', text: t('brand.steps.impact') }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold text-sm">
                      {item.step}
                    </div>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '50K+', label: t('brand.stats.meals') },
                { value: '200+', label: t('brand.stats.donors') },
                { value: '150+', label: t('brand.stats.ngos') }
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-lg">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Register Form Section */}
        <div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl transform hover:rotate-6 transition-transform duration-300">
            <Building className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">{t('auth.register.title')}</h2>
          <p className="text-gray-600 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            {t('auth.register.subtitle')}
          </p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            
            <div className="grid grid-cols-1 gap-6">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  {t('auth.register.chooseRole')}
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: 'donor', label: t('auth.register.donor'), desc: t('auth.register.donorDesc'), color: 'blue', icon: Building },
                    { value: 'ngo', label: t('auth.register.ngo'), desc: t('auth.register.ngoDesc'), color: 'green', icon: Users }
                  ].map((role) => (
                    <label key={role.value} className={`relative flex flex-col items-center p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-md ${
                      selectedRole === role.value 
                        ? (role.color === 'blue' ? 'border-blue-500 bg-blue-50' : 'border-green-500 bg-green-50')
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        {...register('role', { required: t('auth.register.roleRequired') })}
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
                  {selectedRole === 'donor' ? t('auth.register.restaurantName') : t('auth.register.ngoName')}
                </label>
                <input
                  {...register('organization_name', { required: t('auth.register.orgNameRequired') })}
                  type="text"
                  placeholder={selectedRole === 'donor' ? t('auth.register.enterRestaurant') : t('auth.register.enterNgo')}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.register.contactPerson')}</label>
                  <input
                    {...register('contact_person', { required: t('auth.register.contactRequired') })}
                    type="text"
                    placeholder={t('auth.register.fullName')}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.register.phone')}</label>
                  <div className="relative">
                    <div className="flex">
                      <div className="flex items-center px-3 py-3 border-2 border-r-0 border-gray-200 rounded-l-xl bg-gray-50">
                        <span className="text-lg mr-2">🇮🇳</span>
                        <span className="text-sm font-medium text-gray-700">+91</span>
                      </div>
                      <input
                        {...register('phone', { 
                          required: t('auth.register.phoneRequired'),
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.register.email')}</label>
                <div className="relative">
                  <input
                    {...register('email', { 
                      required: t('auth.register.emailRequired'),
                      validate: validateEmail
                    })}
                    type="email"
                    placeholder={t('auth.login.emailPlaceholder')}
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
                  {selectedRole === 'donor' ? t('auth.register.fssai') : t('auth.register.ngoReg')}
                </label>
                <div className="relative">
                  <input
                    {...register('license_number', { 
                      required: t('auth.register.licenseRequired'),
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
                      <strong>FSSAI Format:</strong> {t('auth.register.fssaiFormat')}
                    </p>
                  </div>
                )}
                {selectedRole === 'ngo' && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-700">
                      <strong>NGO Format:</strong> {t('auth.register.ngoFormat')}
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('auth.register.address')}</label>
                <textarea
                  {...register('address', { required: t('auth.register.addressRequired') })}
                  rows="3"
                  placeholder={t('auth.register.completeAddress')}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    {t('auth.register.password')}
                  </label>
                  <div className="relative group">
                    <input
                      {...register('password', { validate: validatePassword })}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      onFocus={() => setIsTyping({ ...isTyping, password: true })}
                      onBlur={() => setIsTyping({ ...isTyping, password: false })}
                      className={`w-full px-4 py-3.5 pr-12 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                        errors.password ? 'border-red-400 focus:border-red-500 bg-red-50' :
                        isPasswordValid && watchedPassword ? 'border-green-400 focus:border-green-500 bg-green-50' :
                        isTyping.password ? 'border-purple-500 bg-purple-50 shadow-lg' :
                        'border-gray-200 focus:border-purple-500 bg-gray-50'
                      } hover:border-purple-300`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-300 ${
                        showPassword 
                          ? 'bg-purple-100 text-purple-600 hover:bg-purple-200 scale-110' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      }`}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-shake">
                      <X className="w-4 h-4" />{errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-pink-600" />
                    {t('auth.register.confirmPassword')}
                  </label>
                  <div className="relative group">
                    <input
                      {...register('confirmPassword', { 
                        required: t('auth.register.confirmRequired'),
                        validate: (value) => value === watchedPassword || t('auth.register.passwordMismatch')
                      })}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('auth.login.passwordPlaceholder')}
                      onFocus={() => setIsTyping({ ...isTyping, confirmPassword: true })}
                      onBlur={() => setIsTyping({ ...isTyping, confirmPassword: false })}
                      className={`w-full px-4 py-3.5 pr-20 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                        errors.confirmPassword ? 'border-red-400 focus:border-red-500 bg-red-50' :
                        watchedConfirmPassword && watchedConfirmPassword === watchedPassword ? 'border-green-400 focus:border-green-500 bg-green-50' :
                        isTyping.confirmPassword ? 'border-pink-500 bg-pink-50 shadow-lg' :
                        'border-gray-200 focus:border-pink-500 bg-gray-50'
                      } hover:border-pink-300`}
                    />
                    {watchedConfirmPassword && (
                      <div className="absolute right-14 top-1/2 transform -translate-y-1/2 transition-all duration-300">
                        {watchedConfirmPassword === watchedPassword ? (
                          <div className="bg-green-100 rounded-full p-1">
                            <Check className="w-4 h-4 text-green-600 animate-bounce" />
                          </div>
                        ) : (
                          <div className="bg-red-100 rounded-full p-1">
                            <X className="w-4 h-4 text-red-600 animate-pulse" />
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-2 rounded-lg transition-all duration-300 ${
                        showConfirmPassword 
                          ? 'bg-pink-100 text-pink-600 hover:bg-pink-200 scale-110' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
                      }`}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-shake">
                      <X className="w-4 h-4" />{errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Requirements */}
              {watchedPassword && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">{t('auth.register.requirements')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: 'length', label: t('auth.register.lengthReq') },
                      { key: 'uppercase', label: t('auth.register.upperReq') },
                      { key: 'lowercase', label: t('auth.register.lowerReq') },
                      { key: 'special', label: t('auth.register.specialReq') }
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
                    {locationLoading ? t('auth.register.locationDetecting') : 
                     location ? t('auth.register.locationDetected') : 
                     t('auth.register.locationRequired')}
                  </p>
                  {!location && !locationLoading && (
                    <p className="text-xs text-red-600 mt-1">
                      {t('auth.register.locationEnable')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || locationLoading || !location}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    {t('auth.register.creatingAccount')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('auth.register.createAccount')}
                  </>
                )}
              </span>
            </button>

            {/* Login Link */}
            <div className="text-center pt-6 border-t border-gray-200">
              <span className="text-gray-600">
                {t('auth.register.haveAccount')}{' '}
                <Link to="/login" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                  {t('auth.register.signIn')} →
                </Link>
              </span>
            </div>
          </form>
        </div>
        </div>
      </div>
    </div>
  );
};

export default Register;