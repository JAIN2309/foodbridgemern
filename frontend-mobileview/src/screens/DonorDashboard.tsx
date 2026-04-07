import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { createDonation, fetchDonorHistory } from '../store/donationSlice';
import { useLocation } from '../hooks/useLocation';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { loadUser } from '../store/authSlice';

export default function DonorDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { userDonations, isLoading } = useAppSelector((state) => state.donations);
  const { user } = useAppSelector((state) => state.auth);
  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    food_items: '', food_category: 'vegetarian', quantity_serves: '',
    pickup_address: '', special_instructions: '', storage_conditions: 'refrigerated',
  });

  const [dates, setDates] = useState({
    pickup_start: new Date(),
    pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
    preparation_time: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago (already prepared)
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const [showPicker, setShowPicker] = useState({ field: '', show: false });

  useEffect(() => { dispatch(fetchDonorHistory()); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDonorHistory());
    setRefreshing(false);
  };

  const openDatePicker = (field: keyof typeof dates, isExpiry = false) => {
    DateTimePickerAndroid.open({
      value: dates[field],
      mode: 'date',
      minimumDate: isExpiry ? new Date() : field === 'preparation_time' ? undefined : new Date(),
      maximumDate: field === 'preparation_time' ? new Date() : undefined,
      onChange: (event, date) => {
        if (event.type === 'set' && date) {
          // After date, open time picker
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (e, time) => {
              if (e.type === 'set' && time) {
                const combined = new Date(date);
                combined.setHours(time.getHours(), time.getMinutes());
                setDates(prev => ({ ...prev, [field]: combined }));
              }
            },
          });
        }
      },
    });
  };

  const formatDateTime = (date: Date) =>
    date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleSubmit = async () => {
    if (!location) { Toast.show({ type: 'error', text1: 'Location access required' }); return; }
    if (!formData.food_items.trim()) { Toast.show({ type: 'error', text1: 'Food items required' }); return; }
    if (!formData.quantity_serves || parseInt(formData.quantity_serves) < 1) { Toast.show({ type: 'error', text1: 'Valid quantity required (min 1)' }); return; }
    if (!formData.pickup_address.trim()) { Toast.show({ type: 'error', text1: 'Pickup address required' }); return; }

    const now = new Date();
    if (dates.expiry_date <= now) { Toast.show({ type: 'error', text1: 'Expiry date must be in the future' }); return; }
    if (dates.preparation_time > now) { Toast.show({ type: 'error', text1: 'Preparation time cannot be in the future' }); return; }
    if (dates.pickup_end <= dates.pickup_start) { Toast.show({ type: 'error', text1: 'Pickup end must be after pickup start' }); return; }

    const donationData = {
      food_items: formData.food_items.split(',').map(item => ({
        name: item.trim(),
        category: formData.food_category,
        storage_conditions: formData.storage_conditions,
        preparation_time: dates.preparation_time.toISOString(),
        expiry_date: dates.expiry_date.toISOString(),
      })),
      quantity_serves: parseInt(formData.quantity_serves),
      coordinates: [location.longitude, location.latitude],
      pickup_address: formData.pickup_address.trim(),
      pickup_window_start: dates.pickup_start.toISOString(),
      pickup_window_end: dates.pickup_end.toISOString(),
      special_instructions: formData.special_instructions,
      photo_url: 'https://via.placeholder.com/400x300',
      safety_checklist: {
        proper_storage: true,
        within_expiry: true,
        hygienic_preparation: true,
        temperature_maintained: true,
      },
    };

    try {
      await dispatch(createDonation(donationData)).unwrap();
      Toast.show({ type: 'success', text1: t('common.success'), text2: 'Donation posted successfully!' });
      setFormData({ food_items: '', food_category: 'vegetarian', quantity_serves: '', pickup_address: '', special_instructions: '', storage_conditions: 'refrigerated' });
      setDates({
        pickup_start: new Date(),
        pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        preparation_time: new Date(Date.now() - 30 * 60 * 1000),
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      await dispatch(fetchDonorHistory()); // refresh stats
      await dispatch(loadUser()); // refresh user activity_stats
      setActiveTab('overview');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Failed to post donation';
      Toast.show({ type: 'error', text1: 'Post Failed', text2: msg, visibilityTime: 5000 });
    }
  };

  const stats = {
    total: user?.activity_stats?.donations_posted || userDonations.length,
    active: userDonations.filter((d: any) => d.status === 'available' || d.status === 'reserved').length,
    completed: userDonations.filter((d: any) => d.status === 'collected').length,
    totalServed: userDonations.filter((d: any) => d.status === 'collected').reduce((sum: number, d: any) => sum + d.quantity_serves, 0),
  };

  const statusColor = (s: string) => ({ available: '#10b981', reserved: '#f59e0b', collected: '#3b82f6' }[s] || '#6b7280');

  const STAT_CARDS = [
    { icon: 'add-circle', value: stats.total, label: t('dashboard.donor.total'), color: '#2563eb' },
    { icon: 'time', value: stats.active, label: t('dashboard.donor.active'), color: '#10b981' },
    { icon: 'checkmark-circle', value: stats.completed, label: t('dashboard.donor.done'), color: '#7c3aed' },
    { icon: 'people', value: stats.totalServed, label: t('dashboard.donor.served'), color: '#f59e0b' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Gradient Header */}
        <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('dashboard.donor.greeting')}, {user?.contact_person?.split(' ')[0] || 'Donor'} 👋</Text>
            <Text style={styles.headerSub}>{t('dashboard.donor.subtitle')}</Text>
          </View>
          <View style={styles.headerAvatar}>
            <Ionicons name="restaurant" size={24} color="#2563eb" />
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STAT_CARDS.map((s, i) => (
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
          {['overview', 'post'].map((tab) => (
            <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
              <Ionicons name={tab === 'overview' ? 'list' : 'add-circle'} size={16} color={activeTab === tab ? '#2563eb' : '#9ca3af'} />
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'overview' ? t('dashboard.donor.myDonations') : t('dashboard.donor.postFood')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'overview' && (
            userDonations.length === 0 ? (
              <View style={styles.empty}>
                <LinearGradient colors={['#eff6ff', '#eef2ff']} style={styles.emptyIcon}>
                  <Ionicons name="fast-food-outline" size={48} color="#2563eb" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>{t('dashboard.donor.noDonations')}</Text>
                <Text style={styles.emptyDesc}>{t('dashboard.donor.noDonationsDesc')}</Text>
                <TouchableOpacity onPress={() => setActiveTab('post')} activeOpacity={0.9}>
                  <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.emptyBtn}>
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.emptyBtnText}>{t('dashboard.donor.postFood')}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              userDonations.map((d: any) => (
                <View key={d._id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardDot, { backgroundColor: statusColor(d.status) }]} />
                    <Text style={styles.cardTitle} numberOfLines={1}>{d.food_items.map((i: any) => i.name).join(', ')}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor(d.status) + '20' }]}>
                      <Text style={[styles.badgeText, { color: statusColor(d.status) }]}>{d.status}</Text>
                    </View>
                  </View>
                  <View style={styles.cardMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{t('dashboard.donor.served')} {d.quantity_serves}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                      <Text style={styles.metaText}>{new Date(d.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>
              ))
            )
          )}

          {activeTab === 'post' && (
            <View style={styles.form}>
              <View style={styles.formHeader}>
                <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.formHeaderIcon}>
                  <Ionicons name="add-circle" size={22} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={styles.formTitle}>{t('dashboard.donor.postTitle')}</Text>
                  <Text style={styles.formSubtitle}>Fill in the details below</Text>
                </View>
              </View>

              {/* Section: Food Info */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#2563eb' }]} />
                <Text style={styles.sectionLabel}>Food Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.foodItems')} *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder={t('dashboard.donor.foodItemsPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={formData.food_items}
                  onChangeText={(v) => setFormData({ ...formData, food_items: v })}
                  underlineColorAndroid="transparent"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.quantity')} *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder={t('dashboard.donor.quantityPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={formData.quantity_serves}
                  onChangeText={(v) => setFormData({ ...formData, quantity_serves: v })}
                  keyboardType="numeric"
                  underlineColorAndroid="transparent"
                />
              </View>

              {/* Food Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Food Category</Text>
                <View style={styles.chipRow}>
                  {[['vegetarian', '🥦', 'Veg'], ['non-vegetarian', '🍗', 'Non-Veg'], ['vegan', '🌱', 'Vegan'], ['mixed', '🍱', 'Mixed']].map(([val, emoji, lbl]) => (
                    <TouchableOpacity key={val}
                      style={[styles.chip, formData.food_category === val && styles.chipActive]}
                      onPress={() => setFormData({ ...formData, food_category: val })}>
                      <Text style={styles.chipEmoji}>{emoji}</Text>
                      <Text style={[styles.chipText, formData.food_category === val && styles.chipTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Storage */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.storage')}</Text>
                <View style={styles.chipRow}>
                  {[['refrigerated', '❄️', t('dashboard.donor.cold')], ['frozen', '🧊', t('dashboard.donor.frozen')], ['room_temperature', '🌡️', t('dashboard.donor.room')]].map(([val, emoji, lbl]) => (
                    <TouchableOpacity key={val}
                      style={[styles.chip, formData.storage_conditions === val && styles.chipActive]}
                      onPress={() => setFormData({ ...formData, storage_conditions: val })}>
                      <Text style={styles.chipEmoji}>{emoji}</Text>
                      <Text style={[styles.chipText, formData.storage_conditions === val && styles.chipTextActive]}>{lbl}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Section: Location */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.sectionLabel}>Pickup Details</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.pickupAddress')} *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder={t('dashboard.donor.pickupAddressPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={formData.pickup_address}
                  onChangeText={(v) => setFormData({ ...formData, pickup_address: v })}
                  underlineColorAndroid="transparent"
                />
              </View>

              {/* Section: Schedule */}
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionDot, { backgroundColor: '#7c3aed' }]} />
                <Text style={styles.sectionLabel}>Schedule & Expiry</Text>
              </View>

              <View style={styles.dateGrid}>
                {[
                  { field: 'pickup_start' as const, label: t('dashboard.donor.pickupStart'), color: '#2563eb', icon: 'time-outline' },
                  { field: 'pickup_end' as const, label: t('dashboard.donor.pickupEnd'), color: '#10b981', icon: 'time-outline' },
                  { field: 'expiry_date' as const, label: '⚠️ Expiry', color: '#f59e0b', icon: 'warning-outline' },
                ].map((item) => (
                  <TouchableOpacity key={item.field} style={[styles.dateCard, { borderColor: item.color + '40' }]}
                    onPress={() => openDatePicker(item.field, item.field === 'expiry_date')}>
                    <View style={[styles.dateCardIcon, { backgroundColor: item.color + '18' }]}>
                      <Ionicons name={item.icon as any} size={16} color={item.color} />
                    </View>
                    <Text style={styles.dateCardLabel}>{item.label}</Text>
                    <Text style={[styles.dateCardValue, { color: item.color }]}>{formatDateTime(dates[item.field])}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Instructions */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.instructions')}</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder={t('dashboard.donor.instructionsPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={formData.special_instructions}
                  onChangeText={(v) => setFormData({ ...formData, special_instructions: v })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  underlineColorAndroid="transparent"
                />
              </View>

              <TouchableOpacity onPress={handleSubmit} disabled={isLoading} activeOpacity={0.9}>
                <LinearGradient colors={['#2563eb', '#7c3aed']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.submitBtn}>
                  {isLoading ? <ActivityIndicator color="#fff" /> : (
                    <><Ionicons name="add-circle-outline" size={20} color="#fff" /><Text style={styles.submitBtnText}>{t('dashboard.donor.postBtn')}</Text></>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
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
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
  tabText: { fontSize: 13, color: '#9ca3af', fontWeight: '600' },
  activeTabText: { color: '#2563eb' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  emptyDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 4 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardDot: { width: 8, height: 8, borderRadius: 4 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1f2937' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#6b7280' },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  formHeaderIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  formTitle: { fontSize: 17, fontWeight: '800', color: '#1f2937' },
  formSubtitle: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, marginTop: 8 },
  sectionDot: { width: 4, height: 16, borderRadius: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', letterSpacing: 0.5 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputField: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', fontSize: 15, color: '#111827' },
  textArea: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', fontSize: 15, color: '#111827', minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb' },
  chipActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#2563eb' },
  dateGrid: { gap: 10, marginBottom: 16 },
  dateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, backgroundColor: '#fff' },
  dateCardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dateCardLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', flex: 1 },
  dateCardValue: { fontSize: 13, fontWeight: '700' },
  submitBtn: { height: 54, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8, elevation: 6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // keep old styles for overview cards
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#fff', minHeight: 52 },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#111827', paddingVertical: 14 },
  segmented: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, backgroundColor: '#f9fafb' },
  segmentActive: { backgroundColor: '#2563eb' },
  segmentText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, backgroundColor: '#f9fafb' },
  dateBtnText: { fontSize: 12, color: '#374151', flex: 1 },
});
