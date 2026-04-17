import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { useAppSelector } from '../hooks/useRedux';
import api from '../services/api';

export default function PasswordResetScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const isLoggedIn = !!user;
  
  const [step, setStep] = useState<'email' | 'otp' | 'password'>(isLoggedIn ? 'otp' : 'email');
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoVerifying, setAutoVerifying] = useState(false);

  // Auto-send OTP for logged-in users
  useEffect(() => {
    if (isLoggedIn && user?.email) {
      handleRequestOTP();
    }
  }, []);

  // Password strength
  const getPasswordStrength = (pwd: string) => {
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

  const handleRequestOTP = async () => {
    const emailToUse = isLoggedIn ? user?.email : email.trim();
    
    if (!emailToUse) {
      Toast.show({ type: 'error', text1: t('passwordReset.enterEmail') });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/request-password-reset', { email: emailToUse });
      Toast.show({ type: 'success', text1: t('passwordReset.otpSent'), text2: response.data.message });
      setStep('otp');
    } catch (error: any) {
      Toast.show({ 
        type: 'error', 
        text1: t('passwordReset.failed'), 
        text2: error.response?.data?.message || 'Failed to send OTP' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp.trim();
    const isAuto = !!otpValue;
    
    if (!otpToVerify || otpToVerify.length !== 6) {
      if (!isAuto) {
        Toast.show({ type: 'error', text1: t('passwordReset.enter6DigitOTP') });
      }
      setAutoVerifying(false);
      return;
    }

    if (!isAuto) setLoading(true);
    
    try {
      const emailToUse = isLoggedIn ? user?.email : email;
      await api.post('/auth/verify-otp', { email: emailToUse, otp: otpToVerify });
      Toast.show({ type: 'success', text1: t('passwordReset.otpVerified') });
      setStep('password');
    } catch (error: any) {
      Toast.show({ 
        type: 'error', 
        text1: t('passwordReset.invalidOTP'), 
        text2: error.response?.data?.message || 'Invalid OTP' 
      });
    } finally {
      setLoading(false);
      setAutoVerifying(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Toast.show({ type: 'error', text1: t('passwordReset.fillAllFields') });
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 25) {
      Toast.show({ type: 'error', text1: t('passwordReset.passwordLength') });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({ type: 'error', text1: t('passwordReset.passwordMismatch') });
      return;
    }

    if (passwordStrength.strength < 100) {
      Toast.show({ type: 'error', text1: t('passwordReset.weakPassword') });
      return;
    }

    setLoading(true);
    try {
      const emailToUse = isLoggedIn ? user?.email : email;
      await api.post('/auth/reset-password', { email: emailToUse, otp, newPassword });
      Toast.show({ type: 'success', text1: t('passwordReset.success'), text2: t('passwordReset.successMessage') });
      
      if (isLoggedIn) {
        // Logged-in user - go back to settings
        setTimeout(() => router.back(), 1500);
      } else {
        // Not logged-in user - go to login
        setTimeout(() => router.replace('/login'), 1500);
      }
    } catch (error: any) {
      Toast.show({ 
        type: 'error', 
        text1: t('passwordReset.failed'), 
        text2: error.response?.data?.message || 'Failed to reset password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasteOTP = async () => {
    const text = await Clipboard.getStringAsync();
    if (text && /^\d{6}$/.test(text)) {
      setOtp(text);
      Toast.show({ type: 'success', text1: t('passwordReset.otpPasted') });
    } else {
      Toast.show({ type: 'error', text1: t('passwordReset.invalidClipboard') });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled" 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (step === 'email' || (isLoggedIn && step === 'otp')) {
                router.back();
              } else {
                setStep(step === 'otp' ? 'email' : 'otp');
              }
            }} 
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isLoggedIn ? t('settings.changePassword') : t('passwordReset.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <LinearGradient colors={['#667eea', '#764ba2']} style={styles.iconGradient}>
            <Ionicons name="lock-closed" size={48} color="#fff" />
          </LinearGradient>
        </View>

        {/* Step Indicator */}
        {!isLoggedIn && (
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step === 'email' && styles.stepDotActive]} />
            <View style={[styles.stepLine, (step === 'otp' || step === 'password') && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive, step === 'password' && styles.stepDotComplete]} />
            <View style={[styles.stepLine, step === 'password' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'password' && styles.stepDotActive]} />
          </View>
        )}
        {isLoggedIn && (
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive, step === 'password' && styles.stepDotComplete]} />
            <View style={[styles.stepLine, step === 'password' && styles.stepLineActive]} />
            <View style={[styles.stepDot, step === 'password' && styles.stepDotActive]} />
          </View>
        )}

        <View style={styles.content}>
          {/* Step 1: Email - Only for non-logged-in users */}
          {!isLoggedIn && step === 'email' && (
            <>
              <Text style={styles.title}>{t('passwordReset.enterEmailTitle')}</Text>
              <Text style={styles.subtitle}>{t('passwordReset.enterEmailSubtitle')}</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.emailPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity onPress={handleRequestOTP} disabled={loading} style={styles.btnWrap}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.btn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="#fff" />
                      <Text style={styles.btnText}>{t('passwordReset.sendOTP')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
              <Text style={styles.title}>{t('passwordReset.verifyOTPTitle')}</Text>
              <Text style={styles.subtitle}>
                {isLoggedIn 
                  ? t('passwordReset.verifyOTPSubtitle', { email: user?.email })
                  : t('passwordReset.verifyOTPSubtitle', { email })
                }
              </Text>

              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder={t('passwordReset.enter6DigitOTP')}
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={(text) => {
                    const numericText = text.replace(/[^0-9]/g, '').slice(0, 6);
                    setOtp(numericText);
                    
                    // Auto-verify when 6 digits are entered
                    if (numericText.length === 6 && !autoVerifying && !loading) {
                      console.log('✅ 6 digits entered, auto-verifying...');
                      setAutoVerifying(true);
                      setTimeout(() => handleVerifyOTP(numericText), 300);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!loading && !autoVerifying}
                />
                {autoVerifying && (
                  <ActivityIndicator size="small" color="#667eea" />
                )}
              </View>

              <TouchableOpacity onPress={handlePasteOTP} style={styles.pasteBtn}>
                <Ionicons name="clipboard-outline" size={18} color="#667eea" />
                <Text style={styles.pasteBtnText}>{t('passwordReset.pasteOTP')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleVerifyOTP()} disabled={loading || autoVerifying} style={styles.btnWrap}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.btn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.btnText}>{t('passwordReset.verifyOTP')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleRequestOTP} disabled={loading || autoVerifying} style={styles.resendBtn}>
                <Text style={styles.resendText}>{t('passwordReset.resendOTP')}</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 'password' && (
            <>
              <Text style={styles.title}>{t('passwordReset.newPasswordTitle')}</Text>
              <Text style={styles.subtitle}>{t('passwordReset.newPasswordSubtitle')}</Text>

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder={t('passwordReset.newPassword')}
                  placeholderTextColor="#9ca3af"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBar}>
                    <View style={[styles.strengthFill, { width: `${passwordStrength.strength}%`, backgroundColor: passwordStrength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: passwordStrength.color }]}>{passwordStrength.label}</Text>
                </View>
              )}

              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#6b7280" />
                <TextInput
                  style={styles.input}
                  placeholder={t('passwordReset.confirmPassword')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>{t('passwordReset.requirements')}</Text>
                <View style={styles.requirement}>
                  <Ionicons name={newPassword.length >= 8 && newPassword.length <= 25 ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={newPassword.length >= 8 && newPassword.length <= 25 ? '#10b981' : '#9ca3af'} />
                  <Text style={styles.requirementText}>{t('passwordReset.req1')}</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons name={/[A-Z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={/[A-Z]/.test(newPassword) ? '#10b981' : '#9ca3af'} />
                  <Text style={styles.requirementText}>{t('passwordReset.req2')}</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons name={/[a-z]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={/[a-z]/.test(newPassword) ? '#10b981' : '#9ca3af'} />
                  <Text style={styles.requirementText}>{t('passwordReset.req3')}</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons name={/[0-9]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={/[0-9]/.test(newPassword) ? '#10b981' : '#9ca3af'} />
                  <Text style={styles.requirementText}>{t('passwordReset.req4')}</Text>
                </View>
                <View style={styles.requirement}>
                  <Ionicons name={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'checkmark-circle' : 'ellipse-outline'} size={16} color={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '#10b981' : '#9ca3af'} />
                  <Text style={styles.requirementText}>{t('passwordReset.req5')}</Text>
                </View>
              </View>

              <TouchableOpacity onPress={handleResetPassword} disabled={loading} style={styles.btnWrap}>
                <LinearGradient colors={['#667eea', '#764ba2']} style={styles.btn}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={20} color="#fff" />
                      <Text style={styles.btnText}>{t('passwordReset.resetPassword')}</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scrollContent: { paddingBottom: 40 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#f9fafb',
    zIndex: 10
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  iconWrap: { alignItems: 'center', marginTop: 20 },
  iconGradient: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', shadowColor: '#667eea', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 32, marginBottom: 24, paddingHorizontal: 40 },
  stepDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#e5e7eb' },
  stepDotActive: { backgroundColor: '#667eea', width: 16, height: 16, borderRadius: 8 },
  stepDotComplete: { backgroundColor: '#10b981' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginHorizontal: 8 },
  stepLineActive: { backgroundColor: '#667eea' },
  content: { paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 16, borderWidth: 2, borderColor: '#e5e7eb', gap: 12 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  btnWrap: { marginTop: 8, marginBottom: 16, borderRadius: 14, overflow: 'hidden', shadowColor: '#667eea', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, marginBottom: 8 },
  pasteBtnText: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  resendBtn: { alignItems: 'center', paddingVertical: 12 },
  resendText: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  strengthWrap: { marginBottom: 16 },
  strengthBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  strengthFill: { height: '100%', borderRadius: 3 },
  strengthLabel: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  requirementsCard: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  requirementsTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 12 },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  requirementText: { fontSize: 13, color: '#4b5563' },
});
