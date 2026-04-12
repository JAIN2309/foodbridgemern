import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { biometricAuth } from '../utils/biometricAuth';
import { useAppSelector } from '../hooks/useRedux';

interface BiometricGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export const BiometricGuard: React.FC<BiometricGuardProps> = ({ children, requireAuth = true }) => {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [error, setError] = useState('');
  const [biometricType, setBiometricType] = useState('Biometric');
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkAndAuth();
  }, [user?.email, requireAuth]);

  const checkAndAuth = async () => {
    if (!requireAuth || !user?.email) {
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return;
    }

    const type = await biometricAuth.getBiometricType();
    setBiometricType(type);

    const enabled = await biometricAuth.isEnabled(user.email);
    setIsEnabled(enabled);

    if (!enabled) {
      setIsAuthenticated(true);
      setIsAuthenticating(false);
      return;
    }

    performAuth();
  };

  // Re-authenticate when app comes to foreground
  useEffect(() => {
    if (!requireAuth || !isEnabled || !user?.email) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && isAuthenticated) {
        setIsAuthenticated(false);
        performAuth();
      }
    });

    return () => subscription.remove();
  }, [isEnabled, requireAuth, isAuthenticated, user?.email]);

  const performAuth = async () => {
    setIsAuthenticating(true);
    setError('');
    const success = await biometricAuth.authenticate(t('biometric.authenticateAccess'));
    if (success) {
      setIsAuthenticated(true);
    } else {
      setError(t('biometric.authenticationFailed'));
    }
    setIsAuthenticating(false);
  };

  if (!requireAuth || !isEnabled) {
    return <>{children}</>;
  }

  if (isAuthenticating) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#eff6ff', '#faf5ff']} style={styles.gradient}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.iconGradient}>
              <Ionicons name="finger-print" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 24 }} />
          <Text style={styles.title}>{t('biometric.authenticating')}</Text>
          <Text style={styles.subtitle}>{t('biometric.useBiometric', { type: biometricType })}</Text>
        </LinearGradient>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#eff6ff', '#faf5ff']} style={styles.gradient}>
          <View style={styles.iconWrap}>
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.iconGradient}>
              <Ionicons name="lock-closed" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.title}>{t('biometric.authenticationRequired')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={performAuth} activeOpacity={0.9}>
            <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.retryBtn}>
              <Ionicons name="finger-print" size={20} color="#fff" />
              <Text style={styles.retryText}>{t('biometric.tryAgain')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconWrap: { marginBottom: 24 },
  iconGradient: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#1f2937', marginTop: 16, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 8, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#ef4444', marginTop: 12, textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16, marginTop: 24, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
