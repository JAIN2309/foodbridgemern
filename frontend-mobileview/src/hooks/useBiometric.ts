import { useState, useEffect } from 'react';
import { biometricAuth } from '../utils/biometricAuth';
import { useAppSelector } from './useRedux';

export const useBiometric = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkBiometric();
  }, [user?.email]);

  const checkBiometric = async () => {
    setIsLoading(true);
    const available = await biometricAuth.isAvailable();
    const type = await biometricAuth.getBiometricType();
    setIsAvailable(available);
    setBiometricType(type);
    
    if (user?.email) {
      const enabled = await biometricAuth.isEnabled(user.email);
      setIsEnabled(enabled);
    } else {
      setIsEnabled(false);
    }
    setIsLoading(false);
  };

  const enable = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 Starting biometric enable for:', email);
      const success = await biometricAuth.authenticate('Enable biometric login');
      console.log('🔐 Biometric authentication result:', success);
      
      if (success) {
        console.log('✅ Biometric auth successful, saving credentials...');
        await biometricAuth.enable(email, password);
        console.log('✅ Credentials saved successfully');
        setIsEnabled(true);
        return true;
      } else {
        console.log('❌ Biometric authentication was cancelled or failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Biometric enable error:', error);
      return false;
    }
  };

  const disable = async (): Promise<boolean> => {
    try {
      if (user?.email) {
        await biometricAuth.disable(user.email);
        setIsEnabled(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const authenticate = async (promptMessage?: string): Promise<boolean> => {
    return await biometricAuth.authenticate(promptMessage);
  };

  const getCredentials = async (email: string) => {
    return await biometricAuth.getCredentials(email);
  };

  return {
    isAvailable,
    isEnabled,
    biometricType,
    isLoading,
    enable,
    disable,
    authenticate,
    getCredentials,
    refresh: checkBiometric,
  };
};
