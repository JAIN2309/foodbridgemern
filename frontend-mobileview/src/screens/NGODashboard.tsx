import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchNearbyDonations, claimDonation, fetchClaimedDonations } from '../store/donationSlice';
import { useLocation } from '../hooks/useLocation';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

export default function NGODashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { donations, claimedDonations } = useAppSelector((state) => state.donations);
  const { user } = useAppSelector((state) => state.auth);
  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState('feed');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (location) {
      dispatch(fetchNearbyDonations({ latitude: location.latitude, longitude: location.longitude }));
      dispatch(fetchClaimedDonations());
    }
  }, [location]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await dispatch(fetchNearbyDonations({ latitude: location.latitude, longitude: location.longitude }));
      await dispatch(fetchClaimedDonations());
    }
    setRefreshing(false);
  };

  const handleClaim = async (donationId: string) => {
    try {
      await dispatch(claimDonation(donationId)).unwrap();
      Toast.show({ type: 'success', text1: 'Donation claimed!' });
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error || 'Failed to claim' });
    }
  };

  const statusColor = (s: string) => ({ available: '#10b981', reserved: '#f59e0b', collected: '#3b82f6' }[s] || '#6b7280');

  const TABS = [
    { key: 'feed', icon: 'list', label: t('dashboard.ngo.liveFeed'), count: donations.length },
    { key: 'claims', icon: 'clipboard', label: t('dashboard.ngo.myClaims'), count: claimedDonations.length },
  ];

  const DonationCard = ({ d, showClaim }: any) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIconWrap, { backgroundColor: statusColor(d.status) + '18' }]}>
          <Ionicons name="fast-food" size={20} color={statusColor(d.status)} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{d.food_items.map((i: any) => i.name).join(', ')}</Text>
          <Text style={styles.cardOrg}>{d.donor_id?.organization_name}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor(d.status) + '20' }]}>
          <Text style={[styles.badgeText, { color: statusColor(d.status) }]}>{d.status}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}><Ionicons name="people-outline" size={13} color="#6b7280" /><Text style={styles.metaText}>{t('dashboard.ngo.serves')} {d.quantity_serves}</Text></View>
        <View style={styles.metaItem}><Ionicons name="location-outline" size={13} color="#6b7280" /><Text style={styles.metaText} numberOfLines={1}>{d.pickup_address}</Text></View>
      </View>
      {showClaim && d.status === 'available' && (
        <TouchableOpacity onPress={() => handleClaim(d._id)} activeOpacity={0.9}>
          <LinearGradient colors={['#10b981', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.claimBtn}>
            <Ionicons name="hand-left-outline" size={16} color="#fff" />
            <Text style={styles.claimBtnText}>{t('dashboard.ngo.claimBtn')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }} edges={['bottom']}>

      {/* Gradient Header */}
      <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('dashboard.ngo.greeting')}, {user?.contact_person?.split(' ')[0] || 'NGO'} 👋</Text>
          <Text style={styles.headerSub}>{t('dashboard.ngo.subtitle')}</Text>
        </View>
        <View style={styles.headerAvatar}>
          <Ionicons name="people" size={24} color="#16a34a" />
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { icon: 'restaurant', value: donations.length, label: t('dashboard.ngo.available'), color: '#10b981' },
          { icon: 'clipboard', value: claimedDonations.length, label: t('dashboard.ngo.claimed'), color: '#2563eb' },
          { icon: 'people', value: claimedDonations.reduce((s: number, d: any) => s + d.quantity_serves, 0), label: t('dashboard.ngo.served'), color: '#7c3aed' },
        ].map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon as any} size={18} color={s.color} />
            </View>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLbl}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, activeTab === t.key && styles.activeTab]} onPress={() => setActiveTab(t.key)}>
            <Ionicons name={t.icon as any} size={16} color={activeTab === t.key ? '#16a34a' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === t.key && styles.activeTabText]}>{t.label}</Text>
            {t.count > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === t.key ? '#16a34a' : '#e5e7eb' }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === t.key ? '#fff' : '#6b7280' }]}>{t.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'feed' && (
          donations.length === 0 ? (
            <View style={styles.empty}>
              <LinearGradient colors={['#f0fdf4', '#dcfce7']} style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={48} color="#16a34a" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{t('dashboard.ngo.noDonations')}</Text>
              <Text style={styles.emptyDesc}>{t('dashboard.ngo.noDonationsDesc')}</Text>
            </View>
          ) : donations.map((d: any) => <DonationCard key={d._id} d={d} showClaim />)
        )}

        {activeTab === 'claims' && (
          claimedDonations.length === 0 ? (
            <View style={styles.empty}>
              <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.emptyIcon}>
                <Ionicons name="clipboard-outline" size={48} color="#2563eb" />
              </LinearGradient>
              <Text style={styles.emptyTitle}>{t('dashboard.ngo.noClaims')}</Text>
              <Text style={styles.emptyDesc}>{t('dashboard.ngo.noClaimsDesc')}</Text>
            </View>
          ) : claimedDonations.map((d: any) => <DonationCard key={d._id} d={d} showClaim={false} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  greeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 14, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#16a34a' },
  tabText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  activeTabText: { color: '#16a34a' },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  tabBadgeText: { fontSize: 10, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  emptyDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  cardOrg: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText: { fontSize: 12, color: '#6b7280', flex: 1 },
  claimBtn: { height: 44, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  claimBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
