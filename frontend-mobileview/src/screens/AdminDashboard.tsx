import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Toast from 'react-native-toast-message';

interface User {
  _id: string;
  organization_name: string;
  email: string;
  role: 'donor' | 'ngo' | 'admin';
  contact_person: string;
  phone: string;
  address: string;
  license_number: string;
  is_verified: boolean;
  createdAt: string;
}

interface Stats {
  users: {
    total: number;
    verified: number;
    pending: number;
  };
  donations: {
    total: number;
    active: number;
    completed: number;
  };
  meals_served: number;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    users: { total: 0, verified: 0, pending: 0 },
    donations: { total: 0, active: 0, completed: 0 },
    meals_served: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [pendingRes, statsRes, usersRes] = await Promise.all([
        api.get('/users/pending'),
        api.get('/users/stats'),
        api.get('/users/all')
      ]);
      
      setPendingUsers(pendingRes.data || []);
      setStats(statsRes.data || stats);
      setAllUsers(usersRes.data || []);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('common.error'),
        text2: error.response?.data?.message || error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleVerifyUser = async (userId: string, approved: boolean) => {
    try {
      await api.put(`/users/${userId}/verify`, { approved });
      Toast.show({
        type: 'success',
        text1: `${t('dashboard.admin.user')} ${approved ? t('dashboard.admin.approved') : t('dashboard.admin.rejected')} ${t('common.success').toLowerCase()}`
      });
      fetchData();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: t('dashboard.admin.failedUpdate')
      });
    }
  };

  const confirmVerification = (userId: string, approved: boolean, userName: string) => {
    Alert.alert(
      `${approved ? t('dashboard.admin.approveUser') : t('dashboard.admin.rejectUser')}`,
      `${approved ? t('dashboard.admin.confirmApprove') : t('dashboard.admin.confirmReject')} ${userName}?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: approved ? t('dashboard.admin.approve') : t('dashboard.admin.reject'), 
          onPress: () => handleVerifyUser(userId, approved),
          style: approved ? 'default' : 'destructive'
        }
      ]
    );
  };

  const getStatusColor = (isVerified: boolean) => {
    return isVerified ? '#10b981' : '#f59e0b';
  };

  const getStatusText = (isVerified: boolean) => {
    return isVerified ? t('dashboard.admin.verified') : t('dashboard.admin.pending');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'donor': return '#3b82f6';
      case 'ngo': return '#10b981';
      case 'admin': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Gradient Header */}
      <LinearGradient colors={['#7c3aed', '#8b5cf6']} style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('dashboard.admin.greeting')} 👋</Text>
          <Text style={styles.headerSub}>{t('dashboard.admin.dashboardSubtitle')}</Text>
        </View>
        <View style={styles.headerAvatar}>
          <Ionicons name="shield-checkmark" size={24} color="#7c3aed" />
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        {[
          { icon: 'people', value: stats.users.total, label: t('dashboard.admin.totalUsers'), color: '#3b82f6' },
          { icon: 'checkmark-circle', value: stats.users.verified, label: t('dashboard.admin.verified'), color: '#10b981' },
          { icon: 'time', value: stats.users.pending, label: t('dashboard.admin.pending'), color: '#f59e0b' },
          { icon: 'restaurant', value: stats.meals_served, label: t('dashboard.admin.meals'), color: '#8b5cf6' },
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
        {[
          { key: 'overview', icon: 'grid', label: t('dashboard.admin.overview') },
          { key: 'verify', icon: 'checkmark-circle', label: `${t('dashboard.admin.verify')} (${pendingUsers.length})` },
          { key: 'users', icon: 'people', label: t('dashboard.admin.users') },
          { key: 'analytics', icon: 'stats-chart', label: t('dashboard.admin.analytics') },
        ].map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.activeTab]} onPress={() => setActiveTab(tab.key)}>
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.key ? '#7c3aed' : '#9ca3af'} />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={['#eff6ff', '#faf5ff']} style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.loadingText}>{t('dashboard.admin.loadingData')}</Text>
            </LinearGradient>
          </View>
        )}

        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#3b82f618' }]}>
                  <Ionicons name="bar-chart" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.cardTitle}>{t('dashboard.admin.donationStats')}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.totalDonations')}</Text>
                  <Text style={[styles.statRowValue, { color: '#3b82f6' }]}>{stats.donations.total}</Text>
                </View>
                <View style={styles.sep} />
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.active')}</Text>
                  <Text style={[styles.statRowValue, { color: '#10b981' }]}>{stats.donations.active}</Text>
                </View>
                <View style={styles.sep} />
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.completed')}</Text>
                  <Text style={[styles.statRowValue, { color: '#8b5cf6' }]}>{stats.donations.completed}</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#10b98118' }]}>
                  <Ionicons name="people" size={20} color="#10b981" />
                </View>
                <Text style={styles.cardTitle}>{t('dashboard.admin.userStats')}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.totalUsers')}</Text>
                  <Text style={[styles.statRowValue, { color: '#3b82f6' }]}>{stats.users.total}</Text>
                </View>
                <View style={styles.sep} />
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.verified')}</Text>
                  <Text style={[styles.statRowValue, { color: '#10b981' }]}>{stats.users.verified}</Text>
                </View>
                <View style={styles.sep} />
                <View style={styles.statRow}>
                  <Text style={styles.statRowLabel}>{t('dashboard.admin.pending')}</Text>
                  <Text style={[styles.statRowValue, { color: '#f59e0b' }]}>{stats.users.pending}</Text>
                </View>
              </View>
            </View>

            <View style={styles.overviewCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#8b5cf618' }]}>
                  <Ionicons name="pulse" size={20} color="#8b5cf6" />
                </View>
                <Text style={styles.cardTitle}>{t('dashboard.admin.platformHealth')}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>{t('dashboard.admin.userVerificationRate')}</Text>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#3b82f6', '#2563eb']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${stats.users.total ? (stats.users.verified / stats.users.total) * 100 : 0}%` as any }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {stats.users.verified} {t('dashboard.admin.of')} {stats.users.total}
                  </Text>
                </View>
                
                <View style={styles.progressItem}>
                  <Text style={styles.progressLabel}>{t('dashboard.admin.donationSuccessRate')}</Text>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${stats.donations.total ? (stats.donations.completed / stats.donations.total) * 100 : 0}%` as any }]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {stats.donations.completed} {t('dashboard.admin.of')} {stats.donations.total}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'verify' && (
          <View style={styles.tabContent}>
            {pendingUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#eff6ff', '#faf5ff']} style={styles.emptyIcon}>
                  <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>{t('dashboard.admin.noPendingVerifications')}</Text>
                <Text style={styles.emptyDesc}>All users are verified!</Text>
              </View>
            ) : (
              pendingUsers.map((user) => (
                <View key={user._id} style={styles.userCard}>
                  <View style={styles.userCardHeader}>
                    <View style={[styles.userAvatar, { backgroundColor: getRoleColor(user.role) + '18' }]}>
                      <Ionicons name="business" size={20} color={getRoleColor(user.role)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{user.organization_name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                        <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.contact_person}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.license_number}</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.approveButton}
                      onPress={() => confirmVerification(user._id, true, user.organization_name)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient colors={['#10b981', '#059669']} style={styles.actionBtnGradient}>
                        <Ionicons name="checkmark" size={18} color="#fff" />
                        <Text style={styles.buttonText}>{t('dashboard.admin.approve')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.rejectButton}
                      onPress={() => confirmVerification(user._id, false, user.organization_name)}
                      activeOpacity={0.9}
                    >
                      <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.actionBtnGradient}>
                        <Ionicons name="close" size={18} color="#fff" />
                        <Text style={styles.buttonText}>{t('dashboard.admin.reject')}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            {allUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <LinearGradient colors={['#eff6ff', '#faf5ff']} style={styles.emptyIcon}>
                  <Ionicons name="people" size={48} color="#3b82f6" />
                </LinearGradient>
                <Text style={styles.emptyTitle}>{t('dashboard.admin.noUsersFound')}</Text>
              </View>
            ) : (
              allUsers.map((user) => (
                <View key={user._id} style={styles.userCard}>
                  <View style={styles.userCardHeader}>
                    <View style={[styles.userAvatar, { backgroundColor: getRoleColor(user.role) + '18' }]}>
                      <Ionicons name="business" size={20} color={getRoleColor(user.role)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>{user.organization_name}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.is_verified) }]}>
                          <Ionicons name={user.is_verified ? 'checkmark-circle' : 'time'} size={10} color="#fff" />
                          <Text style={styles.statusText}>{getStatusText(user.is_verified)}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>{user.contact_person}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={14} color="#6b7280" />
                      <Text style={styles.detailText}>
                        {t('dashboard.admin.joined')} {new Date(user.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'analytics' && (
          <View style={styles.tabContent}>
            {[
              { icon: 'restaurant', value: stats.meals_served, label: t('dashboard.admin.totalImpact'), sub: t('dashboard.admin.meals'), colors: ['#3b82f6', '#2563eb'] as const },
              { icon: 'trending-up', value: `${stats.donations.total ? Math.round((stats.donations.completed / stats.donations.total) * 100) : 0}%`, label: t('dashboard.admin.successRate'), sub: t('dashboard.admin.completionRate'), colors: ['#10b981', '#059669'] as const },
              { icon: 'pulse', value: stats.donations.active, label: t('dashboard.admin.activeNow'), sub: t('dashboard.admin.liveDonations'), colors: ['#8b5cf6', '#7c3aed'] as const },
            ].map((item, i) => (
              <TouchableOpacity key={i} activeOpacity={0.9}>
                <LinearGradient colors={item.colors} style={styles.analyticsCard}>
                  <View style={styles.analyticsIcon}>
                    <Ionicons name={item.icon as any} size={28} color="#fff" />
                  </View>
                  <Text style={styles.analyticsValue}>{item.value}</Text>
                  <Text style={styles.analyticsLabel}>{item.label}</Text>
                  <Text style={styles.analyticsSubLabel}>{item.sub}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}

            <View style={styles.metricsCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#f59e0b18' }]}>
                  <Ionicons name="speedometer" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.cardTitle}>{t('dashboard.admin.keyMetrics')}</Text>
              </View>
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricDot, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.metricTitle}>{t('dashboard.admin.platformAdoption')}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.users.total} {t('dashboard.admin.registeredOrgs')}
                </Text>
              </View>
              
              <View style={styles.sep} />
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricDot, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.metricTitle}>{t('dashboard.admin.responseTime')}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {t('dashboard.admin.avgPickup')}
                </Text>
              </View>
              
              <View style={styles.sep} />
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <View style={[styles.metricDot, { backgroundColor: '#3b82f6' }]} />
                  <Text style={styles.metricTitle}>{t('dashboard.admin.trustScore')}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {Math.round((stats.users.verified / Math.max(stats.users.total, 1)) * 100)}% {t('dashboard.admin.verifiedUsers')}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  greeting: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 14, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabText: { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
  activeTabText: { color: '#7c3aed' },
  content: { flex: 1 },
  loadingContainer: { alignItems: 'center', paddingVertical: 60 },
  loadingBox: { alignItems: 'center', padding: 32, borderRadius: 20, gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  tabContent: { gap: 12 },
  overviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  cardContent: { gap: 10 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statRowLabel: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  statRowValue: { fontSize: 16, fontWeight: '800' },
  sep: { height: 1, backgroundColor: '#f3f4f6' },
  progressItem: { marginBottom: 14 },
  progressLabel: { fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: '500' },
  progressBar: { width: '100%', height: 10, backgroundColor: '#f3f4f6', borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressText: { fontSize: 12, color: '#9ca3af' },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 96, height: 96, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  emptyDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  userCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  userAvatar: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 15, fontWeight: '700', color: '#1f2937', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-start' },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  userDetails: { gap: 8, marginBottom: 14 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 13, color: '#374151', flex: 1 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  approveButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  rejectButton: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  analyticsCard: { padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  analyticsIcon: { marginBottom: 10 },
  analyticsValue: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 6 },
  analyticsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '600', textAlign: 'center' },
  analyticsSubLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2, textAlign: 'center' },
  metricsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  metricItem: { paddingVertical: 12 },
  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  metricDot: { width: 8, height: 8, borderRadius: 4 },
  metricTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  metricValue: { fontSize: 13, color: '#6b7280', marginLeft: 16 },
});