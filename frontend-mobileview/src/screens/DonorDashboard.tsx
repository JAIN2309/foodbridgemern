import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Platform, KeyboardAvoidingView, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { createDonation, fetchDonorHistory } from '../store/donationSlice';
import { useLocation } from '../hooks/useLocation';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { enqueue } from '../utils/offlineQueue';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { loadUser } from '../store/authSlice';

export default function DonorDashboard() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { userDonations, isLoading } = useAppSelector((state) => state.donations);
  const { user } = useAppSelector((state) => state.auth);
  const { location } = useLocation();
  const { isOnline, pendingCount, isSyncing } = useOfflineSync();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    food_items: '', food_category: 'vegetarian', quantity_serves: '',
    weight_kg: '', pickup_address: '', special_instructions: '', storage_conditions: 'refrigerated',
  });

  const [dates, setDates] = useState({
    pickup_start: new Date(),
    pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
    preparation_time: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago (already prepared)
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const [showPicker, setShowPicker] = useState({ field: '', show: false });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; title: string } | null>(null);
  const [showBiometricConfirm, setShowBiometricConfirm] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<any>(null);
  const [selectedDonation, setSelectedDonation] = useState<any>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [scrollIndicatorHeight, setScrollIndicatorHeight] = useState(0);
  const [scrollIndicatorTop, setScrollIndicatorTop] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

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
    if (!formData.weight_kg || parseFloat(formData.weight_kg) < 0.1) { Toast.show({ type: 'error', text1: t('dashboard.donor.weightRequired') }); return; }
    if (!formData.pickup_address.trim()) { Toast.show({ type: 'error', text1: 'Pickup address required' }); return; }

    const now = new Date();
    if (dates.expiry_date <= now) { Toast.show({ type: 'error', text1: 'Expiry date must be in the future' }); return; }
    if (dates.preparation_time > now) { Toast.show({ type: 'error', text1: 'Preparation time cannot be in the future' }); return; }
    if (dates.pickup_end <= dates.pickup_start) { Toast.show({ type: 'error', text1: 'Pickup end must be after pickup start' }); return; }

    if (user?.biometric_enabled) {
      setPendingFormData({ formData, dates, photoUri });
      setShowBiometricConfirm(true);
      return;
    }

    await submitDonation();
  };

  const submitDonation = async () => {
    const data = pendingFormData || { formData, dates, photoUri };
    
    const donationFormData = new FormData();
    
    if (data.photoUri) {
      const filename = data.photoUri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      donationFormData.append('photo', {
        uri: data.photoUri,
        name: filename,
        type,
      } as any);
    }
    
    donationFormData.append('coordinates', JSON.stringify([location!.longitude, location!.latitude]));
    donationFormData.append('food_items', JSON.stringify(data.formData.food_items.split(',').map((item: string) => ({
      name: item.trim(),
      category: data.formData.food_category,
      storage_conditions: data.formData.storage_conditions,
      preparation_time: data.dates.preparation_time.toISOString(),
      expiry_date: data.dates.expiry_date.toISOString(),
    }))));
    donationFormData.append('quantity_serves', data.formData.quantity_serves);
    donationFormData.append('weight_kg', data.formData.weight_kg);
    donationFormData.append('pickup_address', data.formData.pickup_address.trim());
    donationFormData.append('pickup_window_start', data.dates.pickup_start.toISOString());
    donationFormData.append('pickup_window_end', data.dates.pickup_end.toISOString());
    donationFormData.append('special_instructions', data.formData.special_instructions || '');

    try {
      if (!isOnline) {
        // Queue without photo — photos require connectivity
        await enqueue({
          type: 'create_donation',
          payload: {
            coordinates: JSON.stringify([location!.longitude, location!.latitude]),
            food_items: JSON.stringify(data.formData.food_items.split(',').map((item: string) => ({
              name: item.trim(),
              category: data.formData.food_category,
              storage_conditions: data.formData.storage_conditions,
              preparation_time: data.dates.preparation_time.toISOString(),
              expiry_date: data.dates.expiry_date.toISOString(),
            }))),
            quantity_serves: data.formData.quantity_serves,
            weight_kg: data.formData.weight_kg,
            pickup_address: data.formData.pickup_address.trim(),
            pickup_window_start: data.dates.pickup_start.toISOString(),
            pickup_window_end: data.dates.pickup_end.toISOString(),
            special_instructions: data.formData.special_instructions || '',
          }
        });
        Toast.show({ type: 'info', text1: t('offline.savedOffline'), text2: t('offline.donationWillSync') });
        setFormData({ food_items: '', food_category: 'vegetarian', quantity_serves: '', weight_kg: '', pickup_address: '', special_instructions: '', storage_conditions: 'refrigerated' });
        setPhotoUri(null);
        setShowBiometricConfirm(false);
        setPendingFormData(null);
        setActiveTab('overview');
        return;
      }

      await dispatch(createDonation(donationFormData)).unwrap();
      Toast.show({ type: 'success', text1: t('common.success'), text2: 'Donation posted successfully!' });
      setFormData({ food_items: '', food_category: 'vegetarian', quantity_serves: '', weight_kg: '', pickup_address: '', special_instructions: '', storage_conditions: 'refrigerated' });
      setDates({
        pickup_start: new Date(),
        pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        preparation_time: new Date(Date.now() - 30 * 60 * 1000),
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      setPhotoUri(null);
      setShowBiometricConfirm(false);
      setPendingFormData(null);
      await dispatch(fetchDonorHistory());
      await dispatch(loadUser());
      setActiveTab('overview');
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Failed to post donation';
      Toast.show({ type: 'error', text1: 'Post Failed', text2: msg, visibilityTime: 5000 });
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission required', text2: 'Camera roll permission is needed' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({ type: 'error', text1: 'Permission required', text2: 'Camera permission is needed' });
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const removePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setPhotoUri(null) }
      ]
    );
  };

  const openImageModal = (uri: string, title: string) => {
    setSelectedImage({ uri, title });
    setImageModalVisible(true);
  };

  const openDonationDetails = (donation: any) => {
    setSelectedDonation(donation);
    setDetailsModalVisible(true);
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
      {/* Offline / Sync Banner */}
      {(!isOnline || pendingCount > 0) && (
        <View style={{ backgroundColor: isOnline ? '#f59e0b' : '#ef4444', paddingVertical: 6, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={isOnline ? 'sync' : 'cloud-offline'} size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', flex: 1 }}>
            {!isOnline ? t('offline.banner') : `${t('offline.pending')} ${pendingCount} ${t('offline.actions')}${isSyncing ? ` — ${t('offline.syncing')}` : ''}`}
          </Text>
        </View>
      )}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        {/* Image Modal */}
        <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setImageModalVisible(false)}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalClose} onPress={() => setImageModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
              {selectedImage && (
                <>
                  <Image source={{ uri: selectedImage.uri }} style={styles.modalImage} resizeMode="contain" />
                  <Text style={styles.modalTitle}>{selectedImage.title}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Biometric Confirmation Modal */}
        <Modal visible={showBiometricConfirm} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.biometricModal}>
              <View style={styles.biometricIcon}>
                <Ionicons name="finger-print" size={48} color="#2563eb" />
              </View>
              <Text style={styles.biometricTitle}>{t('dashboard.donor.confirmDonation')}</Text>
              <Text style={styles.biometricDesc}>{t('dashboard.donor.confirmDonationMessage')}</Text>
              
              {pendingFormData && (
                <View style={styles.biometricSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('dashboard.donor.foodItems')}:</Text>
                    <Text style={styles.summaryValue}>{pendingFormData.formData.food_items}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('dashboard.donor.serves')}:</Text>
                    <Text style={styles.summaryValue}>{pendingFormData.formData.quantity_serves} people</Text>
                  </View>
                </View>
              )}
              
              <View style={styles.biometricButtons}>
                <TouchableOpacity style={styles.biometricCancel} onPress={() => { setShowBiometricConfirm(false); setPendingFormData(null); }}>
                  <Text style={styles.biometricCancelText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitDonation} activeOpacity={0.9}>
                  <LinearGradient colors={['#2563eb', '#7c3aed']} style={styles.biometricConfirm}>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.biometricConfirmText}>Confirm</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Donation Details Bottom Sheet */}
        <Modal visible={detailsModalVisible} transparent animationType="fade" onRequestClose={() => setDetailsModalVisible(false)}>
          <View style={styles.bottomSheetOverlay}>
            <TouchableOpacity 
              style={styles.overlayTouchable} 
              activeOpacity={1} 
              onPress={() => setDetailsModalVisible(false)}
            />
            
            <View style={styles.bottomSheet}>
              {/* Drag Handle */}
              <View style={styles.sheetHandleContainer}>
                <View style={styles.sheetHandle} />
              </View>
              
              {selectedDonation && (
                <ScrollView 
                  showsVerticalScrollIndicator={true}
                  indicatorStyle="black"
                  bounces={true}
                  contentContainerStyle={styles.sheetContent}
                  scrollIndicatorInsets={{ right: 1 }}
                  onScroll={(event) => {
                    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                    const scrollPercentage = contentOffset.y / (contentSize.height - layoutMeasurement.height);
                    const indicatorHeight = (layoutMeasurement.height / contentSize.height) * layoutMeasurement.height;
                    const indicatorTop = scrollPercentage * (layoutMeasurement.height - indicatorHeight);
                    setScrollIndicatorHeight(indicatorHeight);
                    setScrollIndicatorTop(indicatorTop);
                  }}
                  scrollEventThrottle={16}
                >
                  {/* Header with Status */}
                  <View style={styles.sheetHeaderSection}>
                    <View style={styles.sheetTitleRow}>
                      <View style={[styles.statusIndicator, { backgroundColor: statusColor(selectedDonation.status) }]}>
                        <Ionicons
                          name={
                            selectedDonation.status === 'available' ? 'checkmark-circle' :
                            selectedDonation.status === 'reserved'  ? 'time' :
                            selectedDonation.status === 'collected' ? 'checkmark-done' :
                            'close-circle'
                          }
                          size={16}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sheetTitle}>{selectedDonation.food_items.map((i: any) => i.name).join(', ')}</Text>
                        <Text style={styles.sheetSubtitle}>{t('donationDetails.postedOn')} {new Date(selectedDonation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setDetailsModalVisible(false)} style={styles.sheetCloseBtn}>
                        <Ionicons name="close" size={22} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: statusColor(selectedDonation.status) + '15', borderColor: statusColor(selectedDonation.status) + '30' }]}>
                      <View style={[styles.statusBadgeDot, { backgroundColor: statusColor(selectedDonation.status) }]} />
                      <Text style={[styles.statusBadgeText, { color: statusColor(selectedDonation.status) }]}>
                        {selectedDonation.status === 'available' ? t('donationDetails.availableForPickup') :
                         selectedDonation.status === 'reserved'  ? t('donationDetails.reservedByNGO') :
                         selectedDonation.status === 'collected' ? t('donationDetails.successfullyCollected') :
                         t('donationDetails.expired')}
                      </Text>
                    </View>
                  </View>

                  {/* Image Card */}
                  <View style={styles.imageCard}>
                    <TouchableOpacity
                      onPress={() => {
                        if (selectedDonation.photo_url && !selectedDonation.photo_url.includes('placeholder') && !imgErrors[selectedDonation._id]) {
                          setDetailsModalVisible(false);
                          setTimeout(() => openImageModal(selectedDonation.photo_url, selectedDonation.food_items.map((i: any) => i.name).join(', ')), 300);
                        }
                      }}
                      activeOpacity={0.8}
                      disabled={!selectedDonation.photo_url || selectedDonation.photo_url.includes('placeholder') || !!imgErrors[selectedDonation._id]}
                    >
                      {selectedDonation.photo_url && !selectedDonation.photo_url.includes('placeholder') && !imgErrors[selectedDonation._id] ? (
                        <View>
                          <Image
                            source={{ uri: selectedDonation.photo_url }}
                            style={styles.sheetImageInner}
                            onError={() => setImgErrors(prev => ({ ...prev, [selectedDonation._id]: true }))}
                          />
                          <View style={styles.imageOverlay}>
                            <Ionicons name="expand" size={20} color="#fff" />
                            <Text style={styles.imageOverlayText}>{t('donationDetails.tapToEnlarge')}</Text>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.noImageCard}>
                          <LinearGradient colors={['#f3f4f6', '#e5e7eb']} style={styles.noImageGradient}>
                            <Ionicons name="image-outline" size={56} color="#9ca3af" />
                            <Text style={styles.noImageTitle}>{t('donationDetails.noPhotoAdded')}</Text>
                            <Text style={styles.noImageDesc}>{t('donationDetails.noPhotoDesc')}</Text>
                          </LinearGradient>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Quick Stats Grid */}
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.statGradient}>
                        <Ionicons name="people" size={24} color="#2563eb" />
                      </LinearGradient>
                      <Text style={styles.statValue}>{selectedDonation.quantity_serves}</Text>
                      <Text style={styles.statLabel}>{t('donationDetails.people')}</Text>
                    </View>

                    <View style={styles.statBox}>
                      <LinearGradient colors={['#f0fdf4', '#dcfce7']} style={styles.statGradient}>
                        <Ionicons name="restaurant" size={24} color="#16a34a" />
                      </LinearGradient>
                      <Text style={styles.statValue}>{selectedDonation.food_items[0]?.category?.split('-')[0] || 'Mixed'}</Text>
                      <Text style={styles.statLabel}>{t('donationDetails.category')}</Text>
                    </View>

                    <View style={styles.statBox}>
                      <LinearGradient colors={['#eff6ff', '#dbeafe']} style={styles.statGradient}>
                        <Ionicons name="snow" size={24} color="#3b82f6" />
                      </LinearGradient>
                      <Text style={styles.statValue}>{selectedDonation.food_items[0]?.storage_conditions?.split('_')[0] || 'Room'}</Text>
                      <Text style={styles.statLabel}>{t('donationDetails.storage')}</Text>
                    </View>

                    <View style={styles.statBox}>
                      <LinearGradient colors={['#fef3c7', '#fde68a']} style={styles.statGradient}>
                        <Ionicons name="star" size={24} color="#f59e0b" />
                      </LinearGradient>
                      <Text style={styles.statValue}>{selectedDonation.quality_score?.toFixed(1) || 'N/A'}</Text>
                      <Text style={styles.statLabel}>{t('donationDetails.quality')}</Text>
                    </View>

                    {selectedDonation.weight_kg > 0 && (
                      <View style={[styles.statBox, { backgroundColor: '#ecfdf5' }]}>
                        <LinearGradient colors={['#d1fae5', '#a7f3d0']} style={styles.statGradient}>
                          <Ionicons name="scale" size={24} color="#059669" />
                        </LinearGradient>
                        <Text style={[styles.statValue, { color: '#059669' }]}>{selectedDonation.weight_kg} kg</Text>
                        <Text style={styles.statLabel}>
                          {selectedDonation.status === 'collected' ? t('donationDetails.kgSaved') : t('donationDetails.estimatedWeight')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Kg saved banner */}
                  {selectedDonation.status === 'collected' && selectedDonation.weight_kg > 0 && (
                    <LinearGradient colors={['#059669', '#16a34a']} style={{ borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <View style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                        <Ionicons name="leaf" size={20} color="#fff" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{selectedDonation.weight_kg} kg {t('donationDetails.kgSaved')}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{t('donationDetails.kgSavedDesc')}</Text>
                      </View>
                    </LinearGradient>
                  )}

                  {/* Collected-by card */}
                  {selectedDonation.status === 'collected' && (
                    <View style={{ backgroundColor: '#eff6ff', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#bfdbfe' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <View style={{ width: 32, height: 32, backgroundColor: '#dbeafe', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
                          <Ionicons name="people" size={16} color="#2563eb" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('donationDetails.collectedBy')}</Text>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e40af' }} numberOfLines={1}>
                            {selectedDonation.claimed_by?.organization_name || t('donationDetails.ngoOrganization')}
                          </Text>
                        </View>
                      </View>
                      {selectedDonation.collected_at && (
                        <Text style={{ fontSize: 11, color: '#3b82f6', marginBottom: 6 }}>
                          {t('donationDetails.collectedOn')} {new Date(selectedDonation.collected_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                        <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>{t('donationDetails.thankYouImpact')}</Text>
                      </View>
                    </View>
                  )}

                  {/* Details Section */}
                  <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>{t('donationDetails.pickupInfo')}</Text>
                    
                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                          <Ionicons name="location" size={20} color="#ef4444" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>{t('donationDetails.address')}</Text>
                          <Text style={styles.detailValue}>{selectedDonation.pickup_address}</Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                          <Ionicons name="time" size={20} color="#3b82f6" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>{t('donationDetails.pickupWindow')}</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedDonation.pickup_window_start).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                          <Text style={styles.detailValueSecondary}>
                            {t('donationDetails.until')} {new Date(selectedDonation.pickup_window_end).toLocaleString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={styles.detailCard}>
                      <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                          <Ionicons name="warning" size={20} color="#f59e0b" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailLabel}>{t('donationDetails.expiryDate')}</Text>
                          <Text style={styles.detailValue}>
                            {new Date(selectedDonation.food_items[0]?.expiry_date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Additional Info */}
                  {(selectedDonation.special_instructions || selectedDonation.claimed_by) && (
                    <View style={styles.detailsSection}>
                      <Text style={styles.sectionTitle}>{t('donationDetails.additionalDetails')}</Text>
                      
                      {selectedDonation.special_instructions && (
                        <View style={styles.detailCard}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                              <Ionicons name="document-text" size={20} color="#8b5cf6" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.detailLabel}>{t('donationDetails.specialInstructions')}</Text>
                              <Text style={styles.detailValue}>{selectedDonation.special_instructions}</Text>
                            </View>
                          </View>
                        </View>
                      )}

                      {selectedDonation.claimed_by && (
                        <View style={styles.detailCard}>
                          <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                              <Ionicons name="business" size={20} color="#10b981" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.detailLabel}>{t('donationDetails.claimedBy')}</Text>
                              <Text style={styles.detailValue}>{selectedDonation.claimed_by?.organization_name || 'NGO Organization'}</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
              
              {/* Custom Scroll Indicator */}
              {scrollIndicatorHeight > 0 && scrollIndicatorHeight < 500 && (
                <View style={styles.customScrollbarTrack}>
                  <View 
                    style={[
                      styles.customScrollbarThumb,
                      { 
                        height: Math.max(scrollIndicatorHeight, 40),
                        top: scrollIndicatorTop 
                      }
                    ]} 
                  />
                </View>
              )}
              
              {/* Scroll Indicator Gradient */}
              <LinearGradient 
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', '#ffffff']} 
                style={styles.scrollIndicator}
                pointerEvents="none"
              />
            </View>
          </View>
        </Modal>

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
                <TouchableOpacity key={d._id} style={styles.card} onPress={() => openDonationDetails(d)} activeOpacity={0.7}>
                  <View style={styles.cardRow}>
                    <TouchableOpacity
                      onPress={() => {
                        if (d.photo_url && !d.photo_url.includes('placeholder') && !imgErrors[d._id])
                          openImageModal(d.photo_url, d.food_items.map((i: any) => i.name).join(', '));
                      }}
                    >
                      {d.photo_url && !d.photo_url.includes('placeholder') && !imgErrors[d._id] ? (
                        <Image
                          source={{ uri: d.photo_url }}
                          style={styles.cardImage}
                          onError={() => setImgErrors(prev => ({ ...prev, [d._id]: true }))}
                        />
                      ) : (
                        <View style={[styles.cardImage, styles.noImagePlaceholder]}>
                          <Ionicons name="image-outline" size={28} color="#9ca3af" />
                          <Text style={styles.noImageText}>{t('donationDetails.noPhotoAdded')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.cardContent}>
                      <View style={styles.cardHeader}>
                        <View style={[styles.cardDot, { backgroundColor: statusColor(d.status) }]} />
                        <Text style={styles.cardTitle} numberOfLines={1}>{d.food_items.map((i: any) => i.name).join(', ')}</Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: statusColor(d.status) + '20' }]}>
                        <Text style={[styles.badgeText, { color: statusColor(d.status) }]}>{d.status}</Text>
                      </View>
                      <View style={styles.cardMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="people-outline" size={14} color="#6b7280" />
                          <Text style={styles.metaText}>{t('dashboard.donor.served')} {d.quantity_serves}</Text>
                        </View>
                        {d.weight_kg > 0 && (
                          <View style={styles.metaItem}>
                            <Ionicons name="scale-outline" size={14} color={d.status === 'collected' ? '#059669' : '#6b7280'} />
                            <Text style={[styles.metaText, d.status === 'collected' && { color: '#059669', fontWeight: '600' }]}>
                              {d.weight_kg} kg{d.status === 'collected' ? ` ${t('donationDetails.kgSaved')}` : ''}
                            </Text>
                          </View>
                        )}
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#6b7280" />
                          <Text style={styles.metaText}>{new Date(d.createdAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
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
                <Text style={styles.sectionLabel}>{t('dashboard.donor.foodInfo')}</Text>
              </View>

              {/* Photo Upload */}
              <View style={styles.photoSection}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.foodPhoto')} ({t('dashboard.donor.optional')})</Text>
                {!photoUri ? (
                  <View style={styles.photoUpload}>
                    <View style={styles.photoIcon}>
                      <Ionicons name="camera" size={32} color="#2563eb" />
                    </View>
                    <Text style={styles.photoText}>{t('dashboard.donor.addPhotoDesc')}</Text>
                    <View style={styles.photoButtons}>
                      <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={18} color="#2563eb" />
                        <Text style={styles.photoBtnText}>{t('dashboard.donor.camera')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
                        <Ionicons name="images-outline" size={18} color="#2563eb" />
                        <Text style={styles.photoBtnText}>{t('dashboard.donor.gallery')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.photoPreview}>
                    <TouchableOpacity onPress={() => openImageModal(photoUri, 'Selected Photo')} activeOpacity={0.9}>
                      <Image source={{ uri: photoUri }} style={styles.previewImage} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto}>
                      <Ionicons name="close-circle" size={28} color="#ef4444" />
                    </TouchableOpacity>
                    <View style={styles.photoPreviewBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                      <Text style={styles.photoPreviewText}>{t('dashboard.donor.photoAdded')}</Text>
                    </View>
                  </View>
                )}
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

              {/* Weight in KG */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.weightKg')} *</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder={t('dashboard.donor.weightPlaceholder')}
                  placeholderTextColor="#9ca3af"
                  value={formData.weight_kg}
                  onChangeText={(v) => setFormData({ ...formData, weight_kg: v.replace(/[^0-9.]/g, '') })}
                  keyboardType="decimal-pad"
                  underlineColorAndroid="transparent"
                />
                <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{t('dashboard.donor.weightHint')}</Text>
              </View>

              {/* Food Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('dashboard.donor.foodCategory')}</Text>
                <View style={styles.chipRow}>
                  {[['vegetarian', '🥦', t('donationDetails.vegetarian')], ['non-vegetarian', '🍗', t('donationDetails.non-vegetarian')], ['vegan', '🌱', t('donationDetails.vegan')], ['mixed', '🍱', t('donationDetails.mixed')]].map(([val, emoji, lbl]) => (
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
                  {[['refrigerated', '❄️', t('donationDetails.refrigerated')], ['frozen', '🧊', t('donationDetails.frozen')], ['room_temperature', '🌡️', t('donationDetails.room_temperature')]].map(([val, emoji, lbl]) => (
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
                <Text style={styles.sectionLabel}>{t('dashboard.donor.pickupDetails')}</Text>
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
                <Text style={styles.sectionLabel}>{t('dashboard.donor.scheduleExpiry')}</Text>
              </View>

              <View style={styles.dateGrid}>
                {[
                  { field: 'pickup_start' as const, label: t('dashboard.donor.pickupStart'), color: '#2563eb', icon: 'time-outline' },
                  { field: 'pickup_end' as const, label: t('dashboard.donor.pickupEnd'), color: '#10b981', icon: 'time-outline' },
                  { field: 'expiry_date' as const, label: t('dashboard.donor.expiry'), color: '#f59e0b', icon: 'warning-outline' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', height: '80%', backgroundColor: '#1f2937', borderRadius: 20, padding: 20, justifyContent: 'center', alignItems: 'center' },
  modalClose: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  modalImage: { width: '100%', height: '100%', borderRadius: 12 },
  modalTitle: { position: 'absolute', bottom: 20, color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  biometricModal: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '85%', maxWidth: 400 },
  biometricIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  biometricTitle: { fontSize: 20, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  biometricDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20 },
  biometricSummary: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  summaryValue: { fontSize: 13, color: '#1f2937', fontWeight: '700' },
  biometricButtons: { flexDirection: 'row', gap: 12 },
  biometricCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' },
  biometricCancelText: { fontSize: 15, fontWeight: '700', color: '#6b7280' },
  biometricConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  biometricConfirmText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  photoSection: { marginBottom: 20 },
  photoUpload: { borderWidth: 2, borderStyle: 'dashed', borderColor: '#cbd5e1', borderRadius: 16, padding: 24, alignItems: 'center', backgroundColor: '#f8fafc' },
  photoIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  photoText: { fontSize: 13, color: '#6b7280', marginBottom: 16, textAlign: 'center' },
  photoButtons: { flexDirection: 'row', gap: 12 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#2563eb' },
  photoBtnText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  photoPreview: { position: 'relative', borderRadius: 16, overflow: 'hidden', backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#e5e7eb' },
  previewImage: { width: '100%', height: 240, resizeMode: 'cover' },
  removePhotoBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: '#fff', borderRadius: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  photoPreviewBadge: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  photoPreviewText: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardImage: { width: 80, height: 80, borderRadius: 12 },
  noImagePlaceholder: { backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  noImageText: { fontSize: 10, color: '#9ca3af', fontWeight: '600', marginTop: 4 },
  cardContent: { flex: 1 },
  
  // Bottom Sheet Styles
  bottomSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  overlayTouchable: { flex: 1 },
  bottomSheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 20 },
  sheetHandleContainer: { paddingVertical: 12, alignItems: 'center' },
  sheetHandle: { width: 36, height: 4, backgroundColor: '#d1d5db', borderRadius: 2 },
  sheetContent: { paddingBottom: 30 },
  
  sheetHeaderSection: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  statusIndicator: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827', lineHeight: 26, marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#9ca3af', fontWeight: '500' },
  sheetCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  statusBadgeDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  
  imageCard: { paddingHorizontal: 20, paddingVertical: 20 },
  sheetImageInner: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#f9fafb' },
  imageOverlay: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  imageOverlayText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  
  noImageCard: { width: '100%', height: 220, borderRadius: 16, overflow: 'hidden' },
  noImageGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  noImageTitle: { fontSize: 16, fontWeight: '700', color: '#6b7280', marginTop: 8 },
  noImageDesc: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 40 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20, paddingBottom: 20 },
  statBox: { width: '47%', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  
  detailsSection: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 14, letterSpacing: 0.3 },
  detailCard: { backgroundColor: '#f9fafb', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  detailRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  detailIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  detailLabel: { fontSize: 12, color: '#9ca3af', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600', lineHeight: 20 },
  detailValueSecondary: { fontSize: 13, color: '#6b7280', fontWeight: '500', marginTop: 2 },
  
  customScrollbarTrack: { position: 'absolute', right: 4, top: 60, bottom: 70, width: 6, backgroundColor: '#f3f4f6', borderRadius: 3 },
  customScrollbarThumb: { position: 'absolute', right: 0, width: 6, backgroundColor: '#2563eb', borderRadius: 3, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  scrollIndicator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 60, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
});
