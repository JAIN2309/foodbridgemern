import { useState, useEffect } from 'react';
import { BiometricAuth } from '../utils/biometricAuth';

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAvailability();
    loadPreference();
  }, []);

  const checkAvailability = async () => {
    setIsChecking(true);
    const available = await BiometricAuth.isPlatformAuthenticatorAvailable();
    setIsAvailable(available);
    setIsChecking(false);
  };

  const loadPreference = () => {
    const enabled = localStorage.getItem('biometricEnabled') === 'true';
    setIsEnabled(enabled);
  };

  const enable = async (userId, userName) => {
    const result = await BiometricAuth.register(userId, userName);
    if (result.success) {
      localStorage.setItem('biometricEnabled', 'true');
      localStorage.setItem('biometricCredentialId', result.credentialId);
      setIsEnabled(true);
    }
    return result;
  };

  const disable = () => {
    localStorage.removeItem('biometricEnabled');
    localStorage.removeItem('biometricCredentialId');
    setIsEnabled(false);
  };

  const authenticate = async () => {
    const credentialId = localStorage.getItem('biometricCredentialId');
    return await BiometricAuth.authenticate(credentialId);
  };

  return {
    isAvailable,
    isEnabled,
    isChecking,
    enable,
    disable,
    authenticate,
  };
};
