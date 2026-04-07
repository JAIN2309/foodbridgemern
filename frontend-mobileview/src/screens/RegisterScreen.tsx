import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { registerUser } from '../store/authSlice';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const ROLES = [
  { key: 'donor', label: 'Donor', icon: 'restaurant', desc: 'Share surplus food', colors: ['#2563eb', '#3b82f6'] },
  { key: 'ngo', label: 'NGO', icon: 'people', desc: 'Claim & distribute', colors: ['#16a34a', '#22c55e'] },
];

const FIELDS = [
  { key: 'organization_name', placeholder: 'Organization Name *', icon: 'business-outline', required: true },
  { key: 'contact_person', placeholder: 'Contact Person', icon: 'person-outline' },
  { key: 'phone', placeholder: 'Phone Number', icon: 'call-outline', keyboard: 'phone-pad' },
  { key: 'address', placeholder: 'Address', icon: 'location-outline' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '', password: '', role: 'donor',
    organization_name: '', contact_person: '', phone: '', address: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState('');

  const update = (key: string, val: string) => setFormData(p => ({ ...p, [key]: val }));

  const passStrength = formData.password.length < 6 ? 'weak' : formData.password.length < 8 ? 'good' : 'strong';
  const passColor = { weak: '#ef4444', good: '#eab308', strong: '#22c55e' };
  const passWidth = { weak: '33%', good: '66%', strong: '100%' };

  const handleRegister = async () => {
    if (!formData.email || !formData.password || !formData.organization_name) {
      Toast.show({ type: 'error', text1: 'Fill required fields', text2: 'Email, password & org name required' });
      return;
    }
    try {
      await dispatch(registerUser(formData)).unwrap();
      Toast.show({ type: 'success', text1: 'Account created!' });
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Registration failed';
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: msg, visibilityTime: 4000 });
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
            <Text style={styles.title}>Create Account</Text>
            <View style={styles.subtitleRow}>
              <Ionicons name="sparkles" size={14} color="#eab308" />
              <Text style={styles.subtitle}>Join the FoodBridge community</Text>
            </View>
          </View>

          <View style={styles.card}>

            {/* Role Selector */}
            <Text style={styles.sectionLabel}>I am a...</Text>
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
                  <Text style={[styles.roleLabel, formData.role === r.key && { color: r.colors[0], fontWeight: '700' }]}>{r.label}</Text>
                  <Text style={styles.roleDesc}>{r.desc}</Text>
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
              <Text style={styles.label}>Email Address *</Text>
            </View>
            <View style={[styles.inputWrap, focused === 'email' && styles.inputFocusBlue]}>
              <Ionicons name="mail-outline" size={18} color={focused === 'email' ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.input} placeholder="you@example.com" placeholderTextColor="#9ca3af"
                value={formData.email} onChangeText={(v) => update('email', v)}
                keyboardType="email-address" autoCapitalize="none"
                onFocus={() => setFocused('email')} onBlur={() => setFocused('')}
              />
            </View>

            {/* Password */}
            <View style={[styles.labelRow, { marginTop: 14 }]}>
              <Ionicons name="lock-closed" size={13} color="#7c3aed" />
              <Text style={styles.label}>Password *</Text>
            </View>
            <View style={[styles.inputWrap, focused === 'password' && styles.inputFocusPurple]}>
              <Ionicons name="lock-closed-outline" size={18} color={focused === 'password' ? '#7c3aed' : '#9ca3af'} style={styles.inputIcon} />
              <TextInput
                style={styles.input} placeholder="Min. 6 characters" placeholderTextColor="#9ca3af"
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
                  {passStrength.charAt(0).toUpperCase() + passStrength.slice(1)}
                </Text>
              </View>
            )}

            {/* Other fields */}
            <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>Organization Details</Text><View style={styles.dividerLine} /></View>

            {FIELDS.map((f) => (
              <View key={f.key} style={{ marginBottom: 12 }}>
                <View style={[styles.inputWrap, focused === f.key && styles.inputFocusBlue]}>
                  <Ionicons name={f.icon as any} size={18} color={focused === f.key ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input} placeholder={f.placeholder} placeholderTextColor="#9ca3af"
                    value={(formData as any)[f.key]} onChangeText={(v) => update(f.key, v)}
                    keyboardType={(f as any).keyboard || 'default'}
                    onFocus={() => setFocused(f.key)} onBlur={() => setFocused('')}
                  />
                </View>
              </View>
            ))}

            {/* Submit */}
            <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.9} style={{ marginTop: 8 }}>
              <LinearGradient
                colors={formData.role === 'ngo' ? ['#16a34a', '#2563eb'] : ['#2563eb', '#7c3aed', '#db2777']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Ionicons name="person-add" size={18} color="#fff" />
                    <Text style={styles.btnText}>Create Account</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} style={styles.loginBtn}>
              <Text style={styles.loginText}>Already have an account? <Text style={styles.loginBold}>Sign in →</Text></Text>
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
});
