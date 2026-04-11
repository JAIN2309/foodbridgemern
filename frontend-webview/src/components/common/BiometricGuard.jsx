import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Lock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBiometric } from '../../hooks/useBiometric';
import toast from 'react-hot-toast';

const BiometricGuard = ({ children, screenName = 'this screen' }) => {
  const { t } = useTranslation();
  const { isAvailable, isEnabled, authenticate } = useBiometric();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If biometric is enabled, require authentication
    if (isEnabled) {
      handleBiometricAuth();
    } else {
      // If not enabled, allow access
      setIsAuthenticated(true);
    }
  }, [isEnabled]);

  // Re-authenticate when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isEnabled && isAuthenticated) {
        // Re-authenticate when returning to tab
        setIsAuthenticated(false);
        handleBiometricAuth();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isEnabled, isAuthenticated]);

  const handleBiometricAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const result = await authenticate();
      
      if (result.success) {
        setIsAuthenticated(true);
        toast.success(t('biometric.loginSuccess'));
      } else {
        setAuthError(result.error || t('biometric.authFailed'));
        toast.error(t('biometric.authFailed'));
      }
    } catch (error) {
      setAuthError(error.message || t('biometric.authFailed'));
      toast.error(t('biometric.authFailed'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // If biometric is not enabled, show content directly
  if (!isEnabled) {
    return <>{children}</>;
  }

  // If authenticated, show content
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Show biometric authentication screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Fingerprint className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('biometric.required')}
          </h2>
          <p className="text-gray-600">
            {t('biometric.pleaseAuth')} {screenName}
          </p>
        </div>

        {authError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <p className="text-sm font-medium text-red-800">{t('biometric.authFailedTitle')}</p>
              <p className="text-xs text-red-600 mt-1">{authError}</p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleBiometricAuth}
            disabled={isAuthenticating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAuthenticating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                {t('biometric.authenticating')}
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                {t('biometric.authButton')}
              </>
            )}
          </button>

          <button
            onClick={handleGoBack}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-300"
          >
            {t('biometric.goBack')}
          </button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 text-left">
              {t('biometric.privacyNotice')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiometricGuard;
