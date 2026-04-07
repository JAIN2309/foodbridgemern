import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const statsOpacity = useRef(new Animated.Value(0)).current;
  const blob1 = useRef(new Animated.Value(0)).current;
  const blob2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Blob animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1, { toValue: 1, duration: 3000, useNativeDriver: true }),
        Animated.timing(blob1, { toValue: 0, duration: 3000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2, { toValue: 1, duration: 4000, useNativeDriver: true }),
        Animated.timing(blob2, { toValue: 0, duration: 4000, useNativeDriver: true }),
      ])
    ).start();

    // Entrance animations
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(statsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => router.replace('/login'), 5000);
    return () => clearTimeout(timer);
  }, []);

  const blob1Translate = blob1.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const blob2Translate = blob2.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <LinearGradient colors={['#eff6ff', '#eef2ff', '#faf5ff']} style={styles.container}>
      {/* Animated blobs */}
      <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Translate }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Translate }] }]} />
      <Animated.View style={[styles.blob3, { transform: [{ translateY: blob1Translate }] }]} />

      <View style={styles.content}>
        {/* Logo */}
        <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity }}>
          <LinearGradient
            colors={['#2563eb', '#7c3aed', '#db2777']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.logoContainer}
          >
            <Ionicons name="heart" size={44} color="#fff" />
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View style={{ opacity: titleOpacity, transform: [{ translateY: titleY }], alignItems: 'center', marginTop: 24 }}>
          <Text style={styles.title}>FoodBridge</Text>
          <Animated.View style={{ opacity: taglineOpacity, flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 }}>
            <Ionicons name="sparkles" size={16} color="#eab308" />
            <Text style={styles.tagline}>Bridging Food & Hope</Text>
          </Animated.View>
          <Text style={styles.mission}>
            Connecting donors with NGOs to{'\n'}reduce food waste & fight hunger
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[styles.statsCard, { opacity: statsOpacity }]}>
          {[
            { value: '50K+', label: 'Meals Served', color: '#2563eb' },
            { value: '200+', label: 'Donors', color: '#7c3aed' },
            { value: '150+', label: 'NGOs', color: '#db2777' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statItem, i < 2 && styles.statBorder]}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Feature pills */}
        <Animated.View style={[styles.pills, { opacity: statsOpacity }]}>
          {['Zero Waste', 'Real-time', 'Verified NGOs'].map((pill, i) => (
            <LinearGradient
              key={i}
              colors={['#2563eb22', '#7c3aed22']}
              style={styles.pill}
            >
              <Ionicons name="checkmark-circle" size={14} color="#2563eb" />
              <Text style={styles.pillText}>{pill}</Text>
            </LinearGradient>
          ))}
        </Animated.View>
      </View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: statsOpacity }]}>
        <View style={styles.loadingBar}>
          <LinearGradient
            colors={['#2563eb', '#7c3aed', '#db2777']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.loadingFill}
          />
        </View>
        <Text style={styles.footerText}>Made with ❤️ to fight hunger</Text>
      </Animated.View>
    </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  blob1: {
    position: 'absolute', top: -60, left: -60,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#bfdbfe', opacity: 0.4,
  },
  blob2: {
    position: 'absolute', top: 80, right: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#ddd6fe', opacity: 0.4,
  },
  blob3: {
    position: 'absolute', bottom: -80, left: '30%',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: '#fbcfe8', opacity: 0.4,
  },
  content: { alignItems: 'center', paddingHorizontal: 32, zIndex: 1 },
  logoContainer: {
    width: 96, height: 96, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 16,
  },
  title: {
    fontSize: 42, fontWeight: '800', letterSpacing: -1,
    color: '#2563eb',
  },
  tagline: { fontSize: 15, color: '#6b7280', fontWeight: '500' },
  mission: {
    fontSize: 15, color: '#6b7280', textAlign: 'center',
    marginTop: 12, lineHeight: 22,
  },
  statsCard: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 20, paddingVertical: 20, paddingHorizontal: 8,
    marginTop: 36, width: width - 64,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statBorder: { borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 20, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  pillText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 48, alignItems: 'center', width: width - 64,
  },
  loadingBar: {
    width: '100%', height: 4, backgroundColor: '#e5e7eb',
    borderRadius: 2, overflow: 'hidden', marginBottom: 12,
  },
  loadingFill: { height: '100%', width: '100%', borderRadius: 2 },
  footerText: { fontSize: 13, color: '#9ca3af' },
});
