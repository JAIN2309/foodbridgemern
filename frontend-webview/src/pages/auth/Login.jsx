import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Check, X, Building, Mail, Lock, Sparkles, Heart, Users, TrendingUp, Shield, Fingerprint } from 'lucide-react';
import { loginUser, clearError } from '../../store/slices/authSlice';
import LanguageSelector from '../../components/common/LanguageSelector';
import { useBiometric } from '../../hooks/useBiometric';

const Login = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isLoading, error } = useSelector((state) => state.auth);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const [showPassword, setShowPassword] = useState(false);
  const [isTyping, setIsTyping] = useState({ email: false, password: false });
  const { isAvailable, authenticate, getCredentials, getBiometricUsers, removeBiometricUser } = useBiometric();
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricUsers, setBiometricUsers] = useState([]);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  useEffect(() => {
    if (isAvailable) {
      loadBiometricUsers();
    }
  }, [isAvailable]);

  const loadBiometricUsers = () => {
    const users = getBiometricUsers();
    setBiometricUsers(users);
  };

  const confirmRemoveBiometric = (userEmail) => {
    setUserToRemove(userEmail);
    setShowRemoveModal(true);
  };

  const handleRemoveBiometric = () => {
    if (userToRemove) {
      removeBiometricUser(userToRemove);
      loadBiometricUsers();
      toast.success(t('biometric.removed'));
      setShowRemoveModal(false);
      setUserToRemove(null);
    }
  };

  const watchedEmail = watch('email');
  const watchedPassword = watch('password');

  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) || t('auth.login.emailInvalid');
  };

  const onSubmit = async (data) => {
    try {
      await dispatch(loginUser(data)).unwrap();
      
      // Save credentials if biometric is available
      if (isAvailable) {
        localStorage.setItem(`biometric_${data.email}_email`, data.email);
        localStorage.setItem(`biometric_${data.email}_password`, data.password);
      }
      
      toast.success(t('auth.login.loginSuccess') || 'Login successful!');
    } catch (error) {
      toast.error(error || t('auth.login.loginFailed') || 'Login failed');
    }
  };

  const handleBiometricLogin = async (userEmail) => {
    setIsBiometricLoading(true);
    try {
      // Get credentials for this user
      const credentials = getCredentials(userEmail);
      
      if (!credentials) {
        toast.error(t('biometric.noCredentials'), {
          duration: 4000,
          icon: '🔑',
        });
        setIsBiometricLoading(false);
        return;
      }

      // Authenticate with biometric
      const result = await authenticate(userEmail);
      
      if (result.success) {
        // Use saved credentials to login
        await dispatch(loginUser(credentials)).unwrap();
        toast.success(t('biometric.loginSuccess'));
      } else {
        toast.error(t('biometric.authFailed') + ': ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast.error(t('biometric.loginFailed'));
    } finally {
      setIsBiometricLoading(false);
    }
  };

  React.useEffect(() => {
    return () => dispatch(clearError());
  }, [dispatch]);

  const isEmailValid = watchedEmail ? validateEmail(watchedEmail) === true : null;

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

      <div className="max-w-6xl w-full relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Brand Promotion Section */}
        <div className="hidden lg:block">
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

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Heart, title: t('brand.features.impact'), desc: t('brand.features.impactDesc'), color: 'from-red-500 to-pink-500' },
                { icon: Users, title: t('brand.features.network'), desc: t('brand.features.networkDesc', { count: 500 }), color: 'from-blue-500 to-cyan-500' },
                { icon: TrendingUp, title: t('brand.features.tracking'), desc: t('brand.features.trackingDesc'), color: 'from-green-500 to-emerald-500' },
                { icon: Shield, title: t('brand.features.secure'), desc: t('brand.features.secureDesc'), color: 'from-purple-500 to-indigo-500' }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-3 shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                {t('brand.stats.title')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { value: '50K+', label: t('brand.stats.meals') },
                  { value: '200+', label: t('brand.stats.donors') },
                  { value: '150+', label: t('brand.stats.ngos') }
                ].map((stat, idx) => (
                  <div key={idx} className="text-center">
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{stat.value}</div>
                    <div className="text-xs text-gray-600 mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm italic mb-2">
                    "{t('brand.testimonial')}"
                  </p>
                  <p className="text-xs font-semibold">- {t('brand.testimonialAuthor')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Login Form Section */}
        <div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl transform hover:rotate-6 transition-transform duration-300">
            <Building className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">{t('auth.login.title')}</h2>
          <p className="text-gray-600 flex items-center justify-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            {t('auth.login.subtitle')}
          </p>
        </div>
        
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 border border-white/20">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                {t('auth.login.email')}
              </label>
              <div className="relative group">
                <input
                  {...register('email', { 
                    required: t('auth.login.emailRequired'),
                    validate: validateEmail
                  })}
                  type="email"
                  placeholder={t('auth.login.emailPlaceholder')}
                  onFocus={() => setIsTyping({ ...isTyping, email: true })}
                  onBlur={() => setIsTyping({ ...isTyping, email: false })}
                  className={`w-full px-4 py-3.5 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                    errors.email ? 'border-red-400 focus:border-red-500 bg-red-50' :
                    isEmailValid === true ? 'border-green-400 focus:border-green-500 bg-green-50' :
                    isEmailValid === false ? 'border-red-400 focus:border-red-500 bg-red-50' :
                    isTyping.email ? 'border-blue-500 bg-blue-50 shadow-lg' :
                    'border-gray-200 focus:border-blue-500 bg-gray-50'
                  } hover:border-blue-300`}
                />
                {watchedEmail && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 transition-all duration-300">
                    {isEmailValid ? (
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
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1 animate-shake">
                  <X className="w-4 h-4" />{errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Lock className="w-4 h-4 text-purple-600" />
                {t('auth.login.password')}
              </label>
              <div className="relative group">
                <input
                  {...register('password', { 
                    required: t('auth.login.passwordRequired'),
                    minLength: {
                      value: 6,
                      message: t('auth.login.passwordMin')
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  onFocus={() => setIsTyping({ ...isTyping, password: true })}
                  onBlur={() => setIsTyping({ ...isTyping, password: false })}
                  className={`w-full px-4 py-3.5 pr-12 border-2 rounded-xl focus:outline-none transition-all duration-300 ${
                    errors.password ? 'border-red-400 focus:border-red-500 bg-red-50' : 
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
              {watchedPassword && !errors.password && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${
                      watchedPassword.length < 6 ? 'w-1/3 bg-red-500' :
                      watchedPassword.length < 8 ? 'w-2/3 bg-yellow-500' :
                      'w-full bg-green-500'
                    }`}></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    watchedPassword.length < 6 ? 'text-red-600' :
                    watchedPassword.length < 8 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {watchedPassword.length < 6 ? t('auth.login.weak') :
                     watchedPassword.length < 8 ? t('auth.login.good') : t('auth.login.strong')}
                  </span>
                </div>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link 
                to="/password-reset" 
                className="text-sm font-semibold text-purple-600 hover:text-purple-700 transition-colors duration-200"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    {t('auth.login.signingIn')}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t('auth.login.signIn')}
                  </>
                )}
              </span>
            </button>

            {/* Biometric Login Buttons */}
            {isAvailable && biometricUsers.length > 0 && (
              <>
                <div className="relative mt-8">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">OR</span>
                  </div>
                </div>
                
                <div className="space-y-3 mt-6">
                  {biometricUsers.map((userEmail) => (
                    <div key={userEmail} className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleBiometricLogin(userEmail)}
                        disabled={isBiometricLoading}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold shadow-xl hover:shadow-2xl transform hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                      >
                        <span className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                        <span className="relative flex flex-col items-center justify-center gap-1">
                          <div className="flex items-center gap-2">
                            {isBiometricLoading ? (
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Fingerprint className="w-5 h-5" />
                            )}
                            <span>{t('biometric.loginButton')}</span>
                          </div>
                          <span className="text-xs opacity-90">{userEmail}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmRemoveBiometric(userEmail)}
                        className="w-14 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 border-2 border-red-300"
                        title={t('biometric.remove')}
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Register Link */}
            <div className="text-center pt-6 border-t border-gray-200">
              <span className="text-gray-600">
                {t('auth.login.noAccount')}{' '}
                <Link to="/register" className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-pink-600 transition-all duration-300">
                  {t('auth.login.createAccount')} →
                </Link>
              </span>
            </div>
          </form>
        </div>
        </div>
      </div>

      {/* Remove Biometric Confirmation Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              {t('biometric.removeTitle')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('biometric.removeMessage', { email: userToRemove })}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRemoveModal(false);
                  setUserToRemove(null);
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleRemoveBiometric}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors"
              >
                {t('biometric.remove')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;