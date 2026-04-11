import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { loginUser } from '../store/authSlice';
import Toast from 'react-native-toast-message';
import { LANGUAGES } from '../i18n';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [langModal, setLangModal] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passStrength = password.length < 6 ? 'weak' : password.length < 8 ? 'good' : 'strong';
  const passColor = { weak: '#ef4444', good: '#eab308', strong: '#22c55e' };
  const passWidth = { weak: '33%', good: '66%', strong: '100%' };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: t('auth.login.fillAllFields') });
      return;
    }
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      Toast.show({ type: 'success', text1: t('auth.login.loginSuccess') });
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || t('auth.login.loginFailed');
      Toast.show({ type: 'error', text1: t('auth.login.loginFailed'), text2: msg, visibilityTime: 4000 });
    }
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangModal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#eff6ff', '#eef2ff', '#faf5ff']} style={styles.container}>

        {/* Language Selector Button */}
        <TouchableOpacity 
          style={styles.langButton} 
          onPress={() => setLangModal(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
            style={styles.langButtonGradient}
          >
            <Text style={styles.langButtonFlag}>{currentLang.flag}</Text>
            <Text style={styles.langButtonText}>{currentLang.code.toUpperCase()}</Text>
            <Ionicons name="chevron-down" size={14} color="#6b7280" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Blobs — pointerEvents none so they don't block touches */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <LinearGradient
                colors={['#2563eb', '#7c3aed', '#db2777']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.logoBox}
              >
                <Ionicons name="heart" size={32} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>{t('auth.login.title')}</Text>
              <View style={styles.subtitleRow}>
                <Ionicons name="sparkles" size={14} color="#eab308" />
                <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>

              {/* Email */}
              <View style={styles.labelRow}>
                <Ionicons name="mail" size={13} color="#2563eb" />
                <Text style={styles.label}>{t('auth.login.email')}</Text>
              </View>
              <View style={[styles.inputWrap,
                emailFocused && styles.inputFocusBlue,
                email.length > 0 && (isEmailValid ? styles.inputValid : styles.inputError)
              ]}>
                <Ionicons name="mail-outline" size={18} color={emailFocused ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.emailPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
                {email.length > 0 && (
                  <View style={[styles.validBadge, { backgroundColor: isEmailValid ? '#dcfce7' : '#fee2e2' }]}>
                    <Ionicons name={isEmailValid ? 'checkmark' : 'close'} size={12}
                      color={isEmailValid ? '#16a34a' : '#dc2626'} />
                  </View>
                )}
              </View>

              {/* Password */}
              <View style={[styles.labelRow, { marginTop: 16 }]}>
                <Ionicons name="lock-closed" size={13} color="#7c3aed" />
                <Text style={styles.label}>{t('auth.login.password')}</Text>
              </View>
              <View style={[styles.inputWrap, passFocused && styles.inputFocusPurple]}>
                <Ionicons name="lock-closed-outline" size={18} color={passFocused ? '#7c3aed' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth.login.passwordPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}
                  style={[styles.eyeBtn, { backgroundColor: showPassword ? '#ede9fe' : '#f3f4f6' }]}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={16}
                    color={showPassword ? '#7c3aed' : '#6b7280'} />
                </TouchableOpacity>
              </View>

              {password.length > 0 && (
                <View style={styles.strengthRow}>
                  <View style={styles.strengthBar}>
                    <View style={[styles.strengthFill, { width: passWidth[passStrength] as any, backgroundColor: passColor[passStrength] }]} />
                  </View>
                  <Text style={[styles.strengthText, { color: passColor[passStrength] }]}>
                    {t(`auth.register.${passStrength}`)}
                  </Text>
                </View>
              )}

              {/* Button */}
              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 24 }}>
                <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#2563eb', '#7c3aed', '#db2777']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.btnText}>{t('auth.login.signIn')}</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('auth.login.newUser')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerBtn}>
                <Text style={styles.registerText}>
                  {t('auth.login.createAccount')} <Text style={styles.registerArrow}>→</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[{ v: '50K+', l: t('auth.login.meals'), c: '#2563eb' }, { v: '200+', l: t('auth.login.donors'), c: '#7c3aed' }, { v: '150+', l: t('auth.login.ngos'), c: '#db2777' }].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={[styles.statVal, { color: s.c }]}>{s.v}</Text>
                  <Text style={styles.statLbl}>{s.l}</Text>
                </View>
              ))}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>

        {/* Language Modal */}
        <Modal visible={langModal} transparent animationType="slide" onRequestClose={() => setLangModal(false)}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setLangModal(false)}
          >
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
              {LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langRow, i18n.language === lang.code && styles.langRowActive]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.langFlag}>{lang.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.langNative, i18n.language === lang.code && { color: '#2563eb' }]}>
                      {lang.nativeLabel}
                    </Text>
                    <Text style={styles.langLabel}>{lang.label}</Text>
                  </View>
                  {i18n.language === lang.code && (
                    <View style={styles.langCheck}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  langButton: { position: 'absolute', top: 16, right: 16, zIndex: 10, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  langButtonGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  langButtonFlag: { fontSize: 18 },
  langButtonText: { fontSize: 13, fontWeight: '700', color: '#374151', letterSpacing: 0.5 },
  blob1: { position: 'absolute', top: -60, left: -60, width: 250, height: 250, borderRadius: 125, backgroundColor: '#bfdbfe', opacity: 0.5 },
  blob2: { position: 'absolute', top: 100, right: -80, width: 250, height: 250, borderRadius: 125, backgroundColor: '#ddd6fe', opacity: 0.5 },
  blob3: { position: 'absolute', bottom: -60, left: '20%', width: 250, height: 250, borderRadius: 125, backgroundColor: '#fbcfe8', opacity: 0.4 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 40, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 12, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#1e3a8a', letterSpacing: -0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  card: { backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 28, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#f9fafb', height: 52 },
  inputFocusBlue: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  inputFocusPurple: { borderColor: '#7c3aed', backgroundColor: '#faf5ff' },
  inputValid: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', height: 52 },
  validBadge: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  eyeBtn: { padding: 6, borderRadius: 8 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '600', width: 40 },
  btn: { height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af' },
  registerBtn: { alignItems: 'center', paddingVertical: 4 },
  registerText: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  registerArrow: { color: '#7c3aed' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 28, backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 20, paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1f2937', marginBottom: 20 },
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 8, backgroundColor: '#f9fafb', gap: 14 },
  langRowActive: { backgroundColor: '#eff6ff', borderWidth: 2, borderColor: '#2563eb' },
  langFlag: { fontSize: 28 },
  langNative: { fontSize: 16, fontWeight: '700', color: '#1f2937' },
  langLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  langCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
});
