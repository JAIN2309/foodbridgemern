import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

const FEATURES = [
  { icon: 'leaf-outline', key: 'zeroWaste', color: '#10b981', bg: '#d1fae5' },
  { icon: 'flash-outline', key: 'realTime', color: '#f59e0b', bg: '#fef3c7' },
  { icon: 'shield-checkmark-outline', key: 'verified', color: '#2563eb', bg: '#dbeafe' },
  { icon: 'location-outline', key: 'location', color: '#7c3aed', bg: '#ede9fe' },
];

const STEPS = [
  { icon: 'person-add-outline', key: 'register', color: '#2563eb' },
  { icon: 'add-circle-outline', key: 'post', color: '#10b981' },
  { icon: 'hand-left-outline', key: 'claim', color: '#f59e0b' },
  { icon: 'checkmark-circle-outline', key: 'collect', color: '#7c3aed' },
];

const STATS = [
  { value: '50K+', key: 'meals', color: '#2563eb', icon: 'restaurant' },
  { value: '200+', key: 'donors', color: '#10b981', icon: 'business' },
  { value: '150+', key: 'ngos', color: '#7c3aed', icon: 'people' },
  { value: '50+', key: 'cities', color: '#f59e0b', icon: 'location' },
];

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero Header */}
        <LinearGradient colors={['#1e3a8a', '#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Blobs */}
          <View style={styles.blob1} />
          <View style={styles.blob2} />

          <View style={styles.heroContent}>
            <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.logoWrap}>
              <Ionicons name="heart" size={44} color="#fff" />
            </LinearGradient>
            <Text style={styles.heroTitle}>FoodBridge</Text>
            <Text style={styles.heroTagline}>{t('about.tagline')}</Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroMission}>{t('about.mission')}</Text>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s, i) => (
            <View key={i} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: s.color + '18' }]}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
              </View>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{t(`about.stats.${s.key}`)}</Text>
            </View>
          ))}
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.features.title')}</Text>
          <View style={styles.featuresGrid}>
            {FEATURES.map((f, i) => (
              <View key={i} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                  <Ionicons name={f.icon as any} size={24} color={f.color} />
                </View>
                <Text style={styles.featureTitle}>{t(`about.features.${f.key}`)}</Text>
                <Text style={styles.featureDesc}>{t(`about.features.${f.key}Desc`)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.howItWorks')}</Text>
          <View style={styles.card}>
            {STEPS.map((s, i) => (
              <View key={i}>
                <View style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: s.color }]}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                  <View style={[styles.stepIconWrap, { backgroundColor: s.color + '18' }]}>
                    <Ionicons name={s.icon as any} size={20} color={s.color} />
                  </View>
                  <Text style={styles.stepText}>{t(`about.steps.${s.key}`)}</Text>
                </View>
                {i < STEPS.length - 1 && (
                  <View style={styles.stepConnector}>
                    <View style={styles.stepLine} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Mission */}
        <View style={styles.section}>
          <LinearGradient colors={['#1e3a8a', '#2563eb']} style={styles.missionCard}>
            <View style={styles.missionIcon}>
              <Ionicons name="heart" size={28} color="#fff" />
            </View>
            <Text style={styles.missionTitle}>{t('about.team')}</Text>
            <Text style={styles.missionText}>{t('about.teamDesc')}</Text>
          </LinearGradient>
        </View>

        {/* Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about.contact').toUpperCase()}</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${t('about.contactEmail')}`)}>
              <View style={[styles.contactIcon, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="mail-outline" size={20} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.contactLabel}>{t('about.contact')}</Text>
                <Text style={styles.contactValue}>{t('about.contactEmail')}</Text>
              </View>
              <Ionicons name="open-outline" size={16} color="#9ca3af" style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLogo}>
            <Ionicons name="heart" size={16} color="#db2777" />
            <Text style={styles.footerBrand}>FoodBridge</Text>
          </View>
          <Text style={styles.footerVersion}>{t('about.version')} 1.0.0</Text>
          <Text style={styles.footerMade}>{t('about.madeWith')}</Text>
          <Text style={styles.footerRights}>{t('about.rights')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 24, overflow: 'hidden', position: 'relative' },
  backBtn: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  blob1: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' },
  blob2: { position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  heroContent: { alignItems: 'center', zIndex: 1 },
  logoWrap: { width: 88, height: 88, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  heroTitle: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  heroTagline: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '500' },
  heroDivider: { width: 48, height: 3, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 2, marginVertical: 16 },
  heroMission: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statCard: { width: (width - 48) / 2, alignItems: 'center', padding: 16, backgroundColor: '#f9fafb', borderRadius: 16, gap: 6 },
  statIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  featureCard: { width: (width - 44) / 2, backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  featureIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 14, fontWeight: '700', color: '#1f2937', marginBottom: 4 },
  featureDesc: { fontSize: 12, color: '#6b7280', lineHeight: 18 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stepText: { flex: 1, fontSize: 14, color: '#374151', fontWeight: '500', lineHeight: 20 },
  stepConnector: { paddingLeft: 11, paddingVertical: 4 },
  stepLine: { width: 2, height: 16, backgroundColor: '#e5e7eb', marginLeft: 0 },
  missionCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  missionIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  missionTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 10 },
  missionText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  contactIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  contactLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  contactValue: { fontSize: 14, color: '#2563eb', fontWeight: '600', marginTop: 2 },
  footer: { alignItems: 'center', padding: 32, gap: 6 },
  footerLogo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  footerBrand: { fontSize: 16, fontWeight: '800', color: '#1f2937' },
  footerVersion: { fontSize: 12, color: '#9ca3af' },
  footerMade: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  footerRights: { fontSize: 11, color: '#9ca3af' },
});
