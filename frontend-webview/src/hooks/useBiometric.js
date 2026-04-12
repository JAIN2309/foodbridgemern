import { useState, useEffect } from 'react';
import { BiometricAuth } from '../utils/biometricAuth';
import { useSelector } from 'react-redux';

export const useBiometric = () => {
  const { user } = useSelector((state) => state.auth);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkAvailability();
  }, []);

  useEffect(() => {
    if (user?.email) {
      loadPreference();
    } else {
      setIsEnabled(false);
    }
  }, [user?.email]);

  const checkAvailability = async () => {
    setIsChecking(true);
    const available = await BiometricAuth.isPlatformAuthenticatorAvailable();
    setIsAvailable(available);
    setIsChecking(false);
  };

  const getUserKey = (suffix) => {
    if (!user?.email) return null;
    return `biometric_${user.email}_${suffix}`;
  };

  const loadPreference = () => {
    const enabledKey = getUserKey('enabled');
    if (!enabledKey) return;
    const enabled = localStorage.getItem(enabledKey) === 'true';
    setIsEnabled(enabled);
  };

  const enable = async (email, password) => {
    const result = await BiometricAuth.register(email, email);
    if (result.success) {
      // Store per-user settings
      localStorage.setItem(`biometric_${email}_enabled`, 'true');
      localStorage.setItem(`biometric_${email}_credentialId`, result.credentialId);
      localStorage.setItem(`biometric_${email}_email`, email);
      localStorage.setItem(`biometric_${email}_password`, password);
      
      // Add to biometric users list
      const usersJson = localStorage.getItem('biometricUsers');
      const users = usersJson ? JSON.parse(usersJson) : [];
      if (!users.includes(email)) {
        users.push(email);
        localStorage.setItem('biometricUsers', JSON.stringify(users));
      }
      
      setIsEnabled(true);
    }
    return result;
  };

  const disable = () => {
    if (!user?.email) return;
    
    // Remove user-specific settings
    localStorage.removeItem(`biometric_${user.email}_enabled`);
    localStorage.removeItem(`biometric_${user.email}_credentialId`);
    localStorage.removeItem(`biometric_${user.email}_email`);
    localStorage.removeItem(`biometric_${user.email}_password`);
    
    // Remove from biometric users list
    const usersJson = localStorage.getItem('biometricUsers');
    if (usersJson) {
      const users = JSON.parse(usersJson);
      const updatedUsers = users.filter(u => u !== user.email);
      if (updatedUsers.length > 0) {
        localStorage.setItem('biometricUsers', JSON.stringify(updatedUsers));
      } else {
        localStorage.removeItem('biometricUsers');
      }
    }
    
    setIsEnabled(false);
  };

  const authenticate = async (email) => {
    const credentialId = localStorage.getItem(`biometric_${email}_credentialId`);
    return await BiometricAuth.authenticate(credentialId);
  };

  const getCredentials = (email) => {
    const storedEmail = localStorage.getItem(`biometric_${email}_email`);
    const password = localStorage.getItem(`biometric_${email}_password`);
    if (storedEmail && password) {
      return { email: storedEmail, password };
    }
    return null;
  };

  const getBiometricUsers = () => {
    const usersJson = localStorage.getItem('biometricUsers');
    return usersJson ? JSON.parse(usersJson) : [];
  };

  return {
    isAvailable,
    isEnabled,
    isChecking,
    enable,
    disable,
    authenticate,
    getCredentials,
    getBiometricUsers,
    refresh: loadPreference,
  };
};
