import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../../services/api';

export default function PasswordReset() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useSelector((state) => state.auth);
  const isLoggedIn = !!user;
  
  const [step, setStep] = useState(isLoggedIn ? 'otp' : 'email'); // 'email' | 'otp' | 'password'
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Auto-send OTP for logged-in users
  useEffect(() => {
    if (isLoggedIn && user?.email) {
      handleRequestOTP(null, user.email);
    }
  }, []);

  // Password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: '', color: '#e5e7eb' };
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    const isLongEnough = pwd.length >= 8;
    
    const score = [hasUpper, hasLower, hasNumber, hasSpecial, isLongEnough].filter(Boolean).length;
    
    if (score <= 2) return { strength: 33, label: t('auth.register.weak'), color: '#ef4444' };
    if (score <= 4) return { strength: 66, label: t('auth.register.good'), color: '#f59e0b' };
    return { strength: 100, label: t('auth.register.strong'), color: '#10b981' };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleRequestOTP = async (e, emailOverride = null) => {
    if (e) e.preventDefault();
    const emailToUse = emailOverride || (isLoggedIn ? user?.email : email.trim());
    
    if (!emailToUse) {
      toast.error(t('passwordReset.enterEmail'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/request-password-reset', { email: emailToUse });
      toast.success(t('passwordReset.otpSent'));
      setStep('otp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e, otpValue = null) => {
    if (e) e.preventDefault();
    const otpToVerify = otpValue || otp.trim();
    const isAuto = otpValue !== null;
    
    if (!otpToVerify || otpToVerify.length !== 6) {
      if (!isAuto) {
        toast.error(t('passwordReset.enter6DigitOTP'));
      }
      if (isAuto) setAutoVerifying(false);
      return;
    }

    if (isAuto) setAutoVerifying(true);
    else setLoading(true);
    
    try {
      const emailToUse = isLoggedIn ? user?.email : email;
      await api.post('/auth/verify-otp', { email: emailToUse, otp: otpToVerify });
      toast.success(t('passwordReset.otpVerified'));
      setStep('password');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      if (isAuto) setAutoVerifying(false);
      else setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      toast.error(t('passwordReset.fillAllFields'));
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 25) {
      toast.error(t('passwordReset.passwordLength'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('passwordReset.passwordMismatch'));
      return;
    }

    if (passwordStrength.strength < 100) {
      toast.error(t('passwordReset.weakPassword'));
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmPasswordReset = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const emailToUse = isLoggedIn ? user?.email : email;
      await api.post('/auth/reset-password', { email: emailToUse, otp, newPassword });
      toast.success(t('passwordReset.success'));
      
      if (isLoggedIn) {
        // Logged-in user - go back to settings/dashboard
        setTimeout(() => navigate(-1), 1500);
      } else {
        // Not logged-in user - go to login
        setTimeout(() => navigate('/login'), 1500);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteOTP = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleanedText = text.trim().replace(/[^0-9]/g, '');
      if (cleanedText && /^\d{6}$/.test(cleanedText)) {
        setOtp(cleanedText);
        toast.success(t('passwordReset.otpPasted'));
        // Auto-verify after pasting
        setTimeout(() => handleVerifyOTP(null, cleanedText), 300);
      } else {
        toast.error(t('passwordReset.invalidClipboard'));
      }
    } catch (error) {
      toast.error('Failed to read clipboard');
    }
  };

  const handleBack = () => {
    if (step === 'email' || (isLoggedIn && step === 'otp')) {
      navigate(-1);
    } else if (step === 'otp') {
      setStep('email');
    } else {
      setStep('otp');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center relative">
            <button
              onClick={handleBack}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">{isLoggedIn ? t('settings.changePassword') : t('passwordReset.title')}</h1>
          </div>

          {/* Step Indicator */}
          {!isLoggedIn && (
            <div className="flex items-center justify-center px-8 py-6">
              <div className={`w-4 h-4 rounded-full ${step === 'email' ? 'bg-indigo-600 w-5 h-5' : 'bg-gray-300'}`} />
              <div className={`flex-1 h-0.5 mx-2 ${step === 'otp' || step === 'password' ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`w-4 h-4 rounded-full ${step === 'otp' ? 'bg-indigo-600 w-5 h-5' : step === 'password' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className={`flex-1 h-0.5 mx-2 ${step === 'password' ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`w-4 h-4 rounded-full ${step === 'password' ? 'bg-indigo-600 w-5 h-5' : 'bg-gray-300'}`} />
            </div>
          )}
          {isLoggedIn && (
            <div className="flex items-center justify-center px-8 py-6">
              <div className={`w-4 h-4 rounded-full ${step === 'otp' ? 'bg-indigo-600 w-5 h-5' : step === 'password' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className={`flex-1 h-0.5 mx-2 ${step === 'password' ? 'bg-indigo-600' : 'bg-gray-300'}`} />
              <div className={`w-4 h-4 rounded-full ${step === 'password' ? 'bg-indigo-600 w-5 h-5' : 'bg-gray-300'}`} />
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            {/* Step 1: Email - Only for non-logged-in users */}
            {!isLoggedIn && step === 'email' && (
              <form onSubmit={handleRequestOTP}>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('passwordReset.enterEmailTitle')}</h2>
                <p className="text-gray-600 text-center mb-8">{t('passwordReset.enterEmailSubtitle')}</p>

                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.login.emailPlaceholder')}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {t('passwordReset.sendOTP')}
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOTP}>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('passwordReset.verifyOTPTitle')}</h2>
                <p className="text-gray-600 text-center mb-8">
                  {isLoggedIn 
                    ? t('passwordReset.verifyOTPSubtitle', { email: user?.email })
                    : t('passwordReset.verifyOTPSubtitle', { email })
                  }
                </p>

                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setOtp(value);
                        if (value.length === 6) {
                          setTimeout(() => handleVerifyOTP(null, value), 300);
                        }
                      }}
                      placeholder={t('passwordReset.enter6DigitOTP')}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors text-center text-2xl tracking-widest font-mono"
                      maxLength={6}
                      disabled={autoVerifying || loading}
                      required
                    />
                    {autoVerifying && (
                      <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePasteOTP}
                  className="w-full mb-6 text-indigo-600 hover:text-indigo-700 font-semibold py-2 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t('passwordReset.pasteOTP')}
                </button>

                <button
                  type="submit"
                  disabled={loading || autoVerifying}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                >
                  {loading || autoVerifying ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('passwordReset.verifyOTP')}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleRequestOTP}
                  disabled={loading || autoVerifying}
                  className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2 disabled:opacity-50"
                >
                  {t('passwordReset.resendOTP')}
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword}>
                <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('passwordReset.newPasswordTitle')}</h2>
                <p className="text-gray-600 text-center mb-8">{t('passwordReset.newPasswordSubtitle')}</p>

                <div className="mb-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder={t('passwordReset.newPassword')}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showNewPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                {newPassword.length > 0 && (
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }}
                      />
                    </div>
                    <p className="text-xs text-right mt-1 font-semibold" style={{ color: passwordStrength.color }}>
                      {passwordStrength.label}
                    </p>
                  </div>
                )}

                <div className="mb-6">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder={t('passwordReset.confirmPassword')}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showConfirmPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-sm font-semibold text-blue-900 mb-3">{t('passwordReset.requirements')}</p>
                  <div className="space-y-2">
                    {[
                      { test: newPassword.length >= 8 && newPassword.length <= 25, label: t('passwordReset.req1') },
                      { test: /[A-Z]/.test(newPassword), label: t('passwordReset.req2') },
                      { test: /[a-z]/.test(newPassword), label: t('passwordReset.req3') },
                      { test: /[0-9]/.test(newPassword), label: t('passwordReset.req4') },
                      { test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), label: t('passwordReset.req5') },
                    ].map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <svg className={`w-4 h-4 ${req.test ? 'text-green-500' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-700">{req.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t('passwordReset.resetPassword')}
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Back to Login */}
        {step === 'email' && (
          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-white hover:text-gray-200 font-semibold transition-colors"
            >
              ← {t('auth.login.signIn')}
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              {t('passwordReset.confirmTitle') || 'Confirm Password Change'}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t('passwordReset.confirmMessage') || 'Are you sure you want to change your password? You will need to use the new password for future logins.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmPasswordReset}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                {t('common.confirm') || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
