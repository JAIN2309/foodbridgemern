import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useRedux';
import { logoutUser } from '../../src/store/authSlice';
import { LANGUAGES } from '../../src/i18n';

const SettingRow = ({ icon, label, value, onPress, toggle, toggleValue, onToggle, color = '#2563eb', danger = false }: any) => (
  <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={toggle ? 1 : 0.7}>
    <View style={[styles.rowIcon, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.rowLabel, danger && { color: '#ef4444' }]}>{label}</Text>
    <View style={styles.rowRight}>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {toggle ? <Switch value={toggleValue} onValueChange={onToggle} trackColor={{ false: '#e5e7eb', true: '#2563eb' }} thumbColor="#fff" /> : null}
      {!toggle && !danger && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
      {danger && <Ionicons name="chevron-forward" size={16} color="#ef4444" />}
    </View>
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);
  const [langModal, setLangModal] = useState(false);

  const roleColor = user?.role === 'donor' ? '#2563eb' : user?.role === 'ngo' ? '#16a34a' : '#7c3aed';
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  const handleLogout = () => {
    Alert.alert(t('layout.confirmLogout'), t('layout.logoutMessage'), [
      { text: t('layout.cancel'), style: 'cancel' },
      { text: t('layout.yesLogout'), style: 'destructive', onPress: async () => {
        await dispatch(logoutUser());
        router.replace('/login');
      }},
    ]);
  };

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    setLangModal(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f7fa' }} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <LinearGradient colors={[roleColor, roleColor + 'cc']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.avatarWrap}>
            <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']} style={styles.avatar}>
              <Ionicons name="person" size={36} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.name}>{user?.organization_name}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
          </View>
          <Text style={styles.email}>{user?.email}</Text>
        </LinearGradient>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.account').toUpperCase()}</Text>
          <View style={styles.card}>
            <SettingRow icon="person-outline" label={t('profile.editProfile')} onPress={() => router.push('/(tabs)/profile')} color="#2563eb" />
            <View style={styles.sep} />
            <SettingRow icon="mail-outline" label={t('profile.email')} value={user?.email} color="#7c3aed" />
            <View style={styles.sep} />
            <SettingRow
              icon="shield-checkmark-outline"
              label={t('profile.verificationStatus')}
              value={user?.is_verified ? `${t('profile.verified')} ✓` : t('profile.pending')}
              color={user?.is_verified ? '#16a34a' : '#f59e0b'}
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.language').toUpperCase()}</Text>
          <View style={styles.card}>
            <SettingRow
              icon="language-outline"
              label={t('settings.language')}
              value={`${currentLang.flag} ${currentLang.nativeLabel}`}
              onPress={() => setLangModal(true)}
              color="#2563eb"
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.notificationsSection').toUpperCase()}</Text>
          <View style={styles.card}>
            <SettingRow icon="notifications-outline" label={t('settings.notifications')} toggle toggleValue={notifications} onToggle={setNotifications} color="#2563eb" />
            <View style={styles.sep} />
            <SettingRow icon="mail-outline" label={t('settings.emailAlerts')} toggle toggleValue={emailAlerts} onToggle={setEmailAlerts} color="#7c3aed" />
          </View>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.privacy').toUpperCase()}</Text>
          <View style={styles.card}>
            <SettingRow icon="location-outline" label={t('settings.locationAccess')} toggle toggleValue={locationAccess} onToggle={setLocationAccess} color="#16a34a" />
            <View style={styles.sep} />
            <SettingRow icon="lock-closed-outline" label={t('settings.changePassword')} onPress={() => Alert.alert('Coming Soon', 'Password change via email will be available soon.')} color="#f59e0b" />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.aboutSection').toUpperCase()}</Text>
          <View style={styles.card}>
            <SettingRow icon="information-circle-outline" label={t('settings.appVersion')} value="1.0.0" color="#6b7280" />
            <View style={styles.sep} />
            <SettingRow icon="heart-outline" label={t('settings.about')} onPress={() => router.push('/about')} color="#db2777" />
          </View>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <View style={styles.card}>
            <SettingRow icon="log-out-outline" label={t('settings.logout')} onPress={handleLogout} color="#ef4444" danger />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Language Modal */}
      <Modal visible={langModal} transparent animationType="slide" onRequestClose={() => setLangModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setLangModal(false)}>
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
                  <Text style={[styles.langNative, i18n.language === lang.code && { color: '#2563eb' }]}>{lang.nativeLabel}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { padding: 32, alignItems: 'center', paddingTop: 40, paddingBottom: 36 },
  avatarWrap: { marginBottom: 14 },
  avatar: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  rolePill: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20, marginBottom: 6 },
  roleText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#9ca3af', letterSpacing: 1, marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowValue: { fontSize: 13, color: '#6b7280' },
  sep: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 64 },
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
