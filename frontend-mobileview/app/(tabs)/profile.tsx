import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useRedux';
import { updateProfile, loadUser } from '../../src/store/authSlice';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { BiometricGuard } from '../../src/components/BiometricGuard';

const ROLE_COLORS: any = { donor: ['#2563eb', '#3b82f6'], ngo: ['#16a34a', '#22c55e'], admin: ['#7c3aed', '#8b5cf6'], super_admin: ['#db2777', '#ec4899'] };

const InfoRow = ({ icon, label, value, editable, editKey, multiline = false, isEditing, editData, setEditData, color }: any) => (
  <View style={styles.infoRow}>
    <View style={[styles.infoIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      {isEditing && editable ? (
        <TextInput
          style={[styles.infoInput, { borderColor: color }]}
          value={editData[editKey]}
          onChangeText={(v) => setEditData({ ...editData, [editKey]: v })}
          multiline={multiline}
          autoCorrect={false}
        />
      ) : (
        <Text style={styles.infoValue}>{value || '—'}</Text>
      )}
    </View>
  </View>
);

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState(false);
  const [editData, setEditData] = useState({
    organization_name: user?.organization_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    contact_person: user?.contact_person || '',
  });

  useEffect(() => { dispatch(loadUser()); }, [dispatch]);

  useEffect(() => {
    if (user && !isEditing) {
      setEditData({
        organization_name: user.organization_name || '',
        phone: user.phone || '',
        address: user.address || '',
        contact_person: user.contact_person || '',
      });
      setProfilePicture(user.profile_picture || null);
    }
  }, [user, isEditing]);

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64String = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      // Check size (max 500KB base64)
      if (base64String.length > 500000) {
        Toast.show({ type: 'error', text1: '❌ Image Too Large', text2: 'Please select a smaller image' });
        return;
      }

      setUploadingPicture(true);
      try {
        const api = (await import('../../src/services/api')).default;
        const response = await api.post('/users/profile-picture', { image: base64String });
        setProfilePicture(response.data.profile_picture);
        Toast.show({ type: 'success', text1: '✅ Profile Picture Updated' });
      } catch (error: any) {
        const errorMsg = error.response?.status === 413 ? 'Image too large' : 'Could not upload profile picture';
        Toast.show({ type: 'error', text1: '❌ Upload Failed', text2: errorMsg });
      } finally {
        setUploadingPicture(false);
      }
    }
  };

  const handleDeletePicture = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingPicture(true);
            try {
              const api = (await import('../../src/services/api')).default;
              await api.delete('/users/profile-picture');
              setProfilePicture(null);
              Toast.show({ type: 'success', text1: '✅ Profile Picture Removed' });
            } catch (error) {
              Toast.show({ type: 'error', text1: '❌ Delete Failed' });
            } finally {
              setUploadingPicture(false);
            }
          },
        },
      ]
    );
  };

  if (!user) return null;

  const colors = ROLE_COLORS[user.role] || ROLE_COLORS.donor;

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(editData)).unwrap();
      setIsEditing(false);
      Toast.show({ type: 'success', text1: '✅ Profile Updated', text2: 'Your changes have been saved successfully.' });
    } catch {
      Toast.show({ type: 'error', text1: '❌ Update Failed', text2: 'Could not save changes. Please try again.' });
    }
  };

  const rowProps = { isEditing, editData, setEditData, color: colors[0] };

  return (
    <BiometricGuard>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }} edges={['bottom']}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Gradient Header */}
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity 
              onPress={() => profilePicture ? setImagePreviewModal(true) : handleImageUpload()} 
              onLongPress={handleImageUpload}
              disabled={uploadingPicture} 
              style={styles.avatar}
            >
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color="#fff" />
              )}
              {uploadingPicture && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            {profilePicture && (
              <TouchableOpacity onPress={handleDeletePicture} disabled={uploadingPicture} style={styles.deleteIcon}>
                <Ionicons name="trash" size={12} color="#fff" />
              </TouchableOpacity>
            )}
            {user.is_verified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={10} color="#fff" />
              </View>
            )}
          </View>
          <Text style={styles.name}>{user.organization_name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user.role.replace('_', ' ').toUpperCase()}</Text>
          </View>
          <Text style={styles.email}>{user.email}</Text>

          {/* Edit / Save buttons */}
          <View style={styles.headerBtns}>
            {isEditing ? (
              <>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Ionicons name="checkmark" size={16} color={colors[0]} />
                  <Text style={[styles.saveBtnText, { color: colors[0] }]}>{t('profile.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditing(false)}>
                  <Text style={styles.cancelBtnText}>{t('profile.cancel')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.saveBtn} onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={16} color={colors[0]} />
                <Text style={[styles.saveBtnText, { color: colors[0] }]}>{t('profile.editProfile')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* Stats */}
        {user.activity_stats && (
          <View style={styles.statsRow}>
            {[
              { icon: 'add-circle', value: user.activity_stats.donations_posted || 0, label: t('profile.posted'), color: colors[0] },
              { icon: 'checkmark-circle', value: user.activity_stats.successful_pickups || 0, label: t('profile.success'), color: '#10b981' },
              { icon: 'star', value: user.ratings?.average?.toFixed(1) || '—', label: t('profile.rating'), color: '#f59e0b' },
            ].map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Ionicons name={s.icon as any} size={20} color={s.color} />
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Info Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.profileInfo')}</Text>
          <View style={styles.card}>
            <InfoRow icon="business-outline" label={t('profile.organization')} value={user.organization_name} editable editKey="organization_name" {...rowProps} />
            <View style={styles.sep} />
            <InfoRow icon="person-outline" label={t('profile.contactPerson')} value={user.contact_person} editable editKey="contact_person" {...rowProps} />
            <View style={styles.sep} />
            <InfoRow icon="call-outline" label={t('profile.phone')} value={user.phone} editable editKey="phone" {...rowProps} />
            <View style={styles.sep} />
            <InfoRow icon="location-outline" label={t('profile.address')} value={user.address} editable editKey="address" multiline {...rowProps} />
            <View style={styles.sep} />
            <InfoRow icon="mail-outline" label={t('profile.email')} value={user.email} {...rowProps} />
          </View>
        </View>

        {/* Trust Score */}
        {user.trust_score !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.trustScore')}</Text>
            <View style={styles.card}>
              <View style={styles.trustRow}>
                <Text style={[styles.trustVal, { color: colors[0] }]}>{user.trust_score}</Text>
                <Text style={styles.trustMax}>/100</Text>
              </View>
              <View style={styles.progressBar}>
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${user.trust_score}%` as any }]} />
              </View>
            </View>
          </View>
        )}

        {/* Verification */}
        <View style={styles.section}>
          <View style={[styles.card, styles.verifyCard]}>
            <Ionicons name={user.is_verified ? 'shield-checkmark' : 'time'} size={24}
              color={user.is_verified ? '#10b981' : '#f59e0b'} />
            <Text style={[styles.verifyText, { color: user.is_verified ? '#10b981' : '#f59e0b' }]}>
              {user.is_verified ? t('profile.verified') : t('profile.pending')}
            </Text>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={imagePreviewModal} transparent animationType="fade" onRequestClose={() => setImagePreviewModal(false)}>
        <TouchableOpacity 
          style={styles.previewOverlay} 
          activeOpacity={1} 
          onPress={() => setImagePreviewModal(false)}
        >
          <View style={styles.previewContainer}>
            <TouchableOpacity 
              style={styles.previewCloseBtn} 
              onPress={() => setImagePreviewModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            
            {profilePicture && (
              <Image 
                source={{ uri: profilePicture }} 
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
            
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>{user?.organization_name}</Text>
              <Text style={styles.previewEmail}>{user?.email}</Text>
              
              <View style={styles.previewActions}>
                <TouchableOpacity 
                  style={styles.previewActionBtn}
                  onPress={() => {
                    setImagePreviewModal(false);
                    setTimeout(() => handleImageUpload(), 300);
                  }}
                >
                  <Ionicons name="camera" size={20} color="#fff" />
                  <Text style={styles.previewActionText}>{t('profile.changePhoto')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.previewActionBtn, styles.previewDeleteBtn]}
                  onPress={() => {
                    setImagePreviewModal(false);
                    setTimeout(() => handleDeletePicture(), 300);
                  }}
                >
                  <Ionicons name="trash" size={20} color="#fff" />
                  <Text style={styles.previewActionText}>{t('profile.deletePhoto')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
    </BiometricGuard>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  uploadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  deleteIcon: { position: 'absolute', top: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 2, left: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  roleText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  headerBtns: { flexDirection: 'row', gap: 10 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 14, fontWeight: '700' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  cancelBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#9ca3af', fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  infoLabel: { fontSize: 11, color: '#9ca3af', fontWeight: '600', marginBottom: 3 },
  infoValue: { fontSize: 15, color: '#1f2937', fontWeight: '500' },
  infoInput: { fontSize: 15, color: '#1f2937', borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f9fafb', marginTop: 2 },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 48 },
  trustRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 },
  trustVal: { fontSize: 36, fontWeight: '800' },
  trustMax: { fontSize: 16, color: '#9ca3af' },
  progressBar: { height: 8, backgroundColor: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  verifyCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  verifyText: { fontSize: 16, fontWeight: '700' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewContainer: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', padding: 20 },
  previewCloseBtn: { position: 'absolute', top: 50, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  previewImage: { width: '100%', height: '60%', borderRadius: 20 },
  previewInfo: { marginTop: 24, alignItems: 'center', width: '100%' },
  previewName: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 8 },
  previewEmail: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 24 },
  previewActions: { flexDirection: 'row', gap: 12, width: '100%', paddingHorizontal: 20 },
  previewActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 14 },
  previewDeleteBtn: { backgroundColor: '#ef4444' },
  previewActionText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
