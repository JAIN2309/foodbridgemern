import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
  Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { loginUser } from '../store/authSlice';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const btnScale = useRef(new Animated.Value(1)).current;

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passStrength = password.length < 6 ? 'weak' : password.length < 8 ? 'good' : 'strong';
  const passColor = { weak: '#ef4444', good: '#eab308', strong: '#22c55e' };
  const passWidth = { weak: '33%', good: '66%', strong: '100%' };

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({ type: 'error', text1: 'Please fill all fields' });
      return;
    }
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    try {
      await dispatch(loginUser({ email, password })).unwrap();
      Toast.show({ type: 'success', text1: 'Login successful!' });
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Login failed';
      Toast.show({ type: 'error', text1: 'Login Failed', text2: msg, visibilityTime: 4000 });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient colors={['#eff6ff', '#eef2ff', '#faf5ff']} style={styles.container}>

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
              <Text style={styles.title}>Welcome Back</Text>
              <View style={styles.subtitleRow}>
                <Ionicons name="sparkles" size={14} color="#eab308" />
                <Text style={styles.subtitle}>Sign in to FoodBridge</Text>
              </View>
            </View>

            {/* Card */}
            <View style={styles.card}>

              {/* Email */}
              <View style={styles.labelRow}>
                <Ionicons name="mail" size={13} color="#2563eb" />
                <Text style={styles.label}>Email Address</Text>
              </View>
              <View style={[styles.inputWrap,
                emailFocused && styles.inputFocusBlue,
                email.length > 0 && (isEmailValid ? styles.inputValid : styles.inputError)
              ]}>
                <Ionicons name="mail-outline" size={18} color={emailFocused ? '#2563eb' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
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
                <Text style={styles.label}>Password</Text>
              </View>
              <View style={[styles.inputWrap, passFocused && styles.inputFocusPurple]}>
                <Ionicons name="lock-closed-outline" size={18} color={passFocused ? '#7c3aed' : '#9ca3af'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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
                    {passStrength.charAt(0).toUpperCase() + passStrength.slice(1)}
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
                        <Text style={styles.btnText}>Sign In</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>New to FoodBridge?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity onPress={() => router.push('/register')} style={styles.registerBtn}>
                <Text style={styles.registerText}>
                  Create Account <Text style={styles.registerArrow}>→</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              {[{ v: '50K+', l: 'Meals', c: '#2563eb' }, { v: '200+', l: 'Donors', c: '#7c3aed' }, { v: '150+', l: 'NGOs', c: '#db2777' }].map((s, i) => (
                <View key={i} style={styles.statItem}>
                  <Text style={[styles.statVal, { color: s.c }]}>{s.v}</Text>
                  <Text style={styles.statLbl}>{s.l}</Text>
                </View>
              ))}
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
});
