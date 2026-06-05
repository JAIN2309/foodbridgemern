import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { registerUser } from '../store/authSlice';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const ROLES = [
  { key: 'donor', label: 'auth.register.donor', icon: 'restaurant', desc: 'auth.register.donorDesc', colors: ['#2563eb', '#3b82f6'] },
  { key: 'ngo', label: 'auth.register.ngo', icon: 'people', desc: 'auth.register.ngoDesc', colors: ['#16a34a', '#22c55e'] },
];

// Phone is rendered separately — excluded from generic FIELDS loop
const FIELDS = [
  { key: 'organization_name', placeholder: 'auth.register.orgNamePlaceholder', icon: 'business-outline' },
  { key: 'contact_person',    placeholder: 'auth.register.contactPersonPlaceholder', icon: 'person-outline' },
  { key: 'address',           placeholder: 'auth.register.addressPlaceholder', icon: 'location-outline' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    email: '', password: '', role: 'donor',
    organization_name: '', contact_person: '', phone: '', address: '',
    license_number: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');
  const [coords, setCoords] = useState<{ longitude: number; latitude: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle'|'loading'|'ok'|'denied'>('idle');

  // Request location when screen mounts
  useEffect(() => {
    requestLocation();
  }, []);

  const requestLocation = async () => {
    setLocationStatus('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationStatus('denied'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ longitude: pos.coords.longitude, latitude: pos.coords.latitude });
      setLocationStatus('ok');
    } catch {
      setLocationStatus('denied');
    }
  };

  const update = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));

  const handlePhoneChange = (val: string) => {
    // Strip non-digits and cap at 10 characters
    update('phone', val.replace(/\D/g, '').slice(0, 10));
  };

  const isPhoneValid = formData.phone.length === 10 && /^[6-9][0-9]{9}$/.test(formData.phone);

  const validateForm = (): string | null => {
    if (!formData.email || !formData.password || !formData.organization_name)
      return t('auth.register.fillRequired');
    if (formData.organization_name.trim().length < 2)
      return t('auth.register.orgNameMin');
    if (formData.contact_person.trim().length < 2)
      return t('auth.register.contactMin');
    if (!isPhoneValid)
      return t('auth.register.phoneInvalid');
    if (formData.address.trim().length < 10)
      return t('auth.register.addressMin');
    return validateLicense();
  };

  const handleLicenseChange = (val: string) => {
    if (formData.role === 'donor') {
      // FSSAI: digits only, max 14
      update('license_number', val.replace(/\D/g, '').slice(0, 14));
    } else {
      // NGO: alphanumeric uppercase, max 20
      update('license_number', val.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20));
    }
  };

  const validateLicense = (): string | null => {
    const { license_number, role } = formData;
    if (role === 'donor') {
      if (!/^[1-9][0-9]{13}$/.test(license_number))
        return t('auth.register.fssaiInvalid');
    } else {
      if (!/^[A-Z0-9]{8,20}$/.test(license_number))
        return t('auth.register.ngoInvalid');
    }
    return null;
  };

  const passStrength = formData.password.length < 6 ? 'weak' : formData.password.length < 8 ? 'good' : 'strong';
  const passColor = { weak: '#ef4444', good: '#eab308', strong: '#22c55e' };
  const passWidth = { weak: '33%', good: '66%', strong: '100%' };

  const handleRegister = async () => {
    const validationError = validateForm();
    if (validationError) {
      Toast.show({ type: 'error', text1: t('auth.register.validationError'), text2: validationError, visibilityTime: 4000 });
      return;
    }
    if (!coords) {
      Toast.show({ type: 'error', text1: t('auth.register.locationRequired'), text2: t('auth.register.locationEnable'), visibilityTime: 4000 });
      requestLocation();
      return;
    }
    try {
      await dispatch(registerUser({
        ...formData,
        coordinates: [coords.longitude, coords.latitude],
      })).unwrap();
      Toast.show({ type: 'success', text1: t('auth.register.accountCreated') });
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || t('auth.register.registrationFailed');
      Toast.show({ type: 'error', text1: t('auth.register.registrationFailed'), text2: msg, visibilityTime: 4000 });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <LinearGradient colors={['#f0fdf4', '#eff6ff', '#faf5ff']} style={styles.container}>
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <LinearGradient colors={['#16a34a', '#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBox}>
              <Ionicons name="person-add" size={30} color="#fff" />
            </LinearGradient>
            <Text style={styles.title}>{t('auth.register.title')}</Text>
            <View style={styles.subtitleRow}>
              <Ionicons name="sparkles" size={14} color="#eab308" />
              <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>
            </View>
          </View>

          <View style={styles.card}>

            {/* Role Selector */}
            <Text style={styles.sectionLabel}>{t('auth.register.iAmA')}</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity key={r.key} onPress={() => update('role', r.key)} activeOpacity={0.85}
                  style={[styles.roleCard, formData.role === r.key && styles.roleCardActive]}>
                  {formData.role === r.key ? (
                    <LinearGradient colors={r.colors as any} style={styles.roleIcon}>
                      <Ionicons name={r.icon as any} size={22} color="#fff" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.roleIcon, { backgroundColor: '#f3f4f6' }]}>
                      <Ionicons name={r.icon as any} size={22} color="#9ca3af" />
                    </View>
                  )}
                  <Text style={[styles.roleLabel, formData.role === r.key && { color: r.colors[0], fontWeight: '700' }]}>{t(r.label)}</Text>
                  <Text style={styles.roleDesc}>{t(r.desc)}</Text>
                  {formData.role === r.key && (
                    <View style={[styles.roleCheck, { backgroundColor: r.colors[0] }]}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Email */}
            <View style={styles.labelRow}>
              <Ionicons name="mail" size={13} color="#2563eb" />
              <Text style={styles.label}>{t('auth.register.email')} *</Text>
            </View>
            <View style={[styles.inputWrap, focused === 'email' && styles.inputFocusBlue]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.input} placeholder={t('auth.register.emailPlaceholder')} placeholderTextColor="#9ca3af"
                value={formData.email} onChangeText={(v) => update('email', v)}
                keyboardType="email-address" autoCapitalize="none"
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              />
            </View>

            {/* Password */}
            <View style={[styles.labelRow, { marginTop: 14 }]}>
              <Ionicons name="lock-closed" size={13} color="#7c3aed" />
              <Text style={styles.label}>{t('auth.register.password')} *</Text>
            </View>
            <View style={[styles.inputWrap, focused === 'password' && styles.inputFocusPurple]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? '#7c3aed' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.input} placeholder={t('auth.register.passwordPlaceholder')} placeholderTextColor="#9ca3af"
                value={formData.password} onChangeText={(v) => update('password', v)}
                secureTextEntry={!showPassword}
                onFocus={() => setFocused('password')} onBlur={() => setFocused('')}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}
                style={[styles.eyeBtn, { backgroundColor: showPassword ? '#ede9fe' : '#f3f4f6' }]}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={16} color={showPassword ? '#7c3aed' : '#6b7280'} />
              </TouchableOpacity>
            </View>
            {formData.password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthFill, { width: passWidth[passStrength] as any, backgroundColor: passColor[passStrength] }]} />
                </View>
                <Text style={[styles.strengthText, { color: passColor[passStrength] }]}>
                  {t(`auth.register.${passStrength}`)}
                </Text>
              </View>
            )}

            {/* Other fields */}
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>{t('auth.register.orgDetails')}</Text><View style={styles.dividerLine} /></View>

            {/* org name, contact person, address */}
            {FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <View style={[styles.inputWrap, focused === f.key && styles.inputFocusBlue]}>
                  <Ionicons name={f.icon as any} size={18} color={focused === f.key ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t(f.placeholder)}
                    placeholderTextColor="#9ca3af"
                    value={(formData as any)[f.key]}
                    onChangeText={(v) => update(f.key, v)}
                    onFocus={() => setFocused(f.key)}
                    onBlur={() => setFocused('')}
                  />
                </View>
              </View>
            ))}

            {/* Phone — separate with +91 prefix, digit-only formatter, live indicator */}
            <View style={{ marginBottom: 12 }}>
              <View style={styles.labelRow}>
                <Ionicons name="call" size={13} color="#2563eb" />
                <Text style={styles.label}>{t('auth.register.phone')} *</Text>
              </View>
              <View style={[styles.inputWrap, focused === 'phone' && styles.inputFocusBlue,
                formData.phone.length > 0 ? (isPhoneValid ? styles.inputValid : styles.inputError) : {}
              ]}>
                {/* +91 prefix */}
                <View style={styles.prefixBox}>
                  <Text style={styles.flag}>🇮🇳</Text>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="9876543210"
                  placeholderTextColor="#9ca3af"
                  value={formData.phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="numeric"
                  maxLength={10}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused('')}
                />
                {formData.phone.length > 0 && (
                  <Ionicons
                    name={isPhoneValid ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={isPhoneValid ? '#22c55e' : '#ef4444'}
                  />
                )}
              </View>
              {formData.phone.length > 0 && !isPhoneValid && (
                <Text style={styles.errorText}>{t('auth.register.phoneInvalid')}</Text>
              )}
            </View>

            {/* License Number (FSSAI / NGO) */}
            <View style={{ marginBottom: 12 }}>
              <View style={styles.labelRow}>
                <Ionicons name="document-text-outline" size={13} color="#2563eb" />
                <Text style={styles.label}>
                  {formData.role === 'donor' ? t('auth.register.fssai') : t('auth.register.ngoReg')} *
                </Text>
              </View>
              <View style={[styles.inputWrap, focused === 'license_number' && styles.inputFocusBlue]}>
                <Ionicons name="card-outline" size={18} color={focused === 'license_number' ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={formData.role === 'donor' ? '12345678901234 (14 digits)' : 'NGO123ABC (8-20 chars)'}
                  placeholderTextColor="#9ca3af"
                  value={formData.license_number}
                  onChangeText={handleLicenseChange}
                  keyboardType={formData.role === 'donor' ? 'numeric' : 'default'}
                  autoCapitalize="characters"
                  maxLength={formData.role === 'donor' ? 14 : 20}
                  onFocus={() => setFocused('license_number')}
                  onBlur={() => setFocused('')}
                />
                {formData.license_number.length > 0 && (
                  <Ionicons
                    name={validateLicense() === null ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={validateLicense() === null ? '#22c55e' : '#ef4444'}
                  />
                )}
              </View>
              <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                {formData.role === 'donor' ? t('auth.register.fssaiFormat') : t('auth.register.ngoFormat')}
              </Text>
            </View>

            {/* Location status indicator */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, padding: 10, borderRadius: 10,
              backgroundColor: locationStatus === 'ok' ? '#f0fdf4' : locationStatus === 'denied' ? '#fef2f2' : '#eff6ff',
              borderWidth: 1,
              borderColor: locationStatus === 'ok' ? '#bbf7d0' : locationStatus === 'denied' ? '#fecaca' : '#bfdbfe' }}>
              <Ionicons
                name={locationStatus === 'ok' ? 'location' : locationStatus === 'denied' ? 'location-outline' : 'time-outline'}
                size={16}
                color={locationStatus === 'ok' ? '#16a34a' : locationStatus === 'denied' ? '#dc2626' : '#2563eb'}
              />
              <Text style={{ flex: 1, fontSize: 12, color: locationStatus === 'ok' ? '#15803d' : locationStatus === 'denied' ? '#b91c1c' : '#1d4ed8' }}>
                {locationStatus === 'ok'
                  ? t('auth.register.locationDetected')
                  : locationStatus === 'denied'
                  ? t('auth.register.locationEnable')
                  : t('auth.register.locationDetecting')}
              </Text>
              {locationStatus === 'denied' && (
                <TouchableOpacity onPress={requestLocation}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#dc2626' }}>{t('auth.register.retryLocation')}</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit */}
            <TouchableOpacity onPress={handleRegister} disabled={isLoading || locationStatus === 'loading'} activeOpacity={0.9} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={formData.role === 'ngo' ? ['#16a34a', '#2563eb'] : ['#2563eb', '#7c3aed', '#db2777']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <Text style={styles.btnText}>{t('auth.register.createBtn')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.loginBtn}>
              <Text style={styles.loginText}>{t('auth.register.alreadyHaveAccount')} <Text style={styles.loginBold}>{t('auth.register.signIn')} →</Text></Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  blob1: { position: 'absolute', top: -40, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: '#bbf7d0', opacity: 0.5 },
  blob2: { position: 'absolute', bottom: -60, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: '#ddd6fe', opacity: 0.4 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 56 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBox: { width: 76, height: 76, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10, marginBottom: 14 },
  title: { fontSize: 30, fontWeight: '800', color: '#1e3a8a', letterSpacing: -0.5 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  subtitle: { fontSize: 14, color: '#6b7280' },
  card: { backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 28, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 12 },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleCard: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', position: 'relative' },
  roleCardActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  roleLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  roleDesc: { fontSize: 11, color: '#9ca3af', marginTop: 2, textAlign: 'center' },
  roleCheck: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 14, backgroundColor: '#f9fafb', height: 52 },
  inputFocusBlue: { borderColor: '#2563eb', backgroundColor: '#eff6ff', shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  inputFocusPurple: { borderColor: '#7c3aed', backgroundColor: '#faf5ff', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827' },
  eyeBtn: { padding: 6, borderRadius: 8 },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 4 },
  strengthBar: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' },
  strengthFill: { height: '100%', borderRadius: 2 },
  strengthText: { fontSize: 11, fontWeight: '600', width: 40 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  btn: { height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loginBtn: { alignItems: 'center', marginTop: 20, paddingVertical: 4 },
  loginText: { fontSize: 14, color: '#6b7280' },
  loginBold: { color: '#2563eb', fontWeight: '700' },
  inputValid: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  inputError: { borderColor: '#ef4444', backgroundColor: '#fef2f2' },
  prefixBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingRight: 8 },
  flag: { fontSize: 16 },
  prefixText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  prefixDivider: { width: 1, height: 24, backgroundColor: '#e5e7eb', marginRight: 10 },
  errorText: { fontSize: 11, color: '#ef4444', marginTop: 4 },
});
