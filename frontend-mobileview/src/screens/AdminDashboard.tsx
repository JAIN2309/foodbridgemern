import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('dashboard.admin.title')}</Text>
        <Text style={styles.subtitle}>{t('dashboard.admin.dashboardSubtitle')}</Text>
      </View>

      {/* Stats Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.statsContainer}
        contentContainerStyle={styles.statsContent}
      >
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.users.total}</Text>
          <Text style={styles.statLabel}>{t('dashboard.admin.totalUsers')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.users.verified}</Text>
          <Text style={styles.statLabel}>{t('dashboard.admin.verified')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.users.pending}</Text>
          <Text style={styles.statLabel}>{t('dashboard.admin.pending')}</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="restaurant" size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats.meals_served}</Text>
          <Text style={styles.statLabel}>{t('dashboard.admin.meals')}</Text>
        </View>
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            {t('dashboard.admin.overview')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'verify' && styles.activeTab]}
          onPress={() => setActiveTab('verify')}
        >
          <Text style={[styles.tabText, activeTab === 'verify' && styles.activeTabText]}>
            {t('dashboard.admin.verify')} ({pendingUsers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            {t('dashboard.admin.users')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            {t('dashboard.admin.analytics')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>{t('dashboard.admin.loadingData')}</Text>
          </View>
        )}

        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.cardTitle}>{t('dashboard.admin.donationStats')}</Text>
                <View style={styles.cardContent}>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.totalDonations')}:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.active')}:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.active}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.completed')}:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.completed}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.overviewCard}>
                <Text style={styles.cardTitle}>{t('dashboard.admin.userStats')}</Text>
                <View style={styles.cardContent}>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.totalUsers')}:</Text>
                    <Text style={styles.statRowValue}>{stats.users.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.verified')}:</Text>
                    <Text style={styles.statRowValue}>{stats.users.verified}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>{t('dashboard.admin.pending')}:</Text>
                    <Text style={styles.statRowValue}>{stats.users.pending}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.progressSection}>
              <Text style={styles.cardTitle}>{t('dashboard.admin.platformHealth')}</Text>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>{t('dashboard.admin.userVerificationRate')}</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${stats.users.total ? (stats.users.verified / stats.users.total) * 100 : 0}%`,
                        backgroundColor: '#3b82f6'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {stats.users.verified} {t('dashboard.admin.of')} {stats.users.total} {t('dashboard.admin.verified').toLowerCase()}
                </Text>
              </View>
              
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>{t('dashboard.admin.donationSuccessRate')}</Text>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        width: `${stats.donations.total ? (stats.donations.completed / stats.donations.total) * 100 : 0}%`,
                        backgroundColor: '#10b981'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {stats.donations.completed} {t('dashboard.admin.of')} {stats.donations.total} {t('dashboard.admin.completed').toLowerCase()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'verify' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>{t('dashboard.admin.pendingVerifications')}</Text>
            {pendingUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>{t('dashboard.admin.noPendingVerifications')}</Text>
              </View>
            ) : (
              pendingUsers.map((user) => (
                <View key={user._id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.organization_name}</Text>
                      <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                        <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.contact_person}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="call" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.phone}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="document-text" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.license_number}</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => confirmVerification(user._id, true, user.organization_name)}
                    >
                      <Ionicons name="checkmark" size={16} color="#fff" />
                      <Text style={styles.buttonText}>{t('dashboard.admin.approve')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => confirmVerification(user._id, false, user.organization_name)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.buttonText}>{t('dashboard.admin.reject')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>{t('dashboard.admin.allUsersTitle')} ({allUsers.length})</Text>
            {allUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>{t('dashboard.admin.noUsersFound')}</Text>
              </View>
            ) : (
              allUsers.map((user) => (
                <View key={user._id} style={styles.userCard}>
                  <View style={styles.userHeader}>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.organization_name}</Text>
                      <View style={styles.badgeContainer}>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(user.role) }]}>
                          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user.is_verified) }]}>
                          <Text style={styles.statusText}>
                            {getStatusText(user.is_verified)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Ionicons name="mail" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="person" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>{user.contact_person}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color="#6b7280" />
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
            <Text style={styles.sectionTitle}>{t('dashboard.admin.platformAnalytics')}</Text>
            
            <View style={styles.analyticsGrid}>
              <View style={[styles.analyticsCard, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="people" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>{stats.meals_served}</Text>
                <Text style={styles.analyticsLabel}>{t('dashboard.admin.totalImpact')}</Text>
                <Text style={styles.analyticsSubLabel}>{t('dashboard.admin.meals')}</Text>
              </View>
              
              <View style={[styles.analyticsCard, { backgroundColor: '#10b981' }]}>
                <Ionicons name="trending-up" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>
                  {stats.donations.total ? 
                    Math.round((stats.donations.completed / stats.donations.total) * 100) : 0}%
                </Text>
                <Text style={styles.analyticsLabel}>{t('dashboard.admin.successRate')}</Text>
                <Text style={styles.analyticsSubLabel}>{t('dashboard.admin.completionRate')}</Text>
              </View>
              
              <View style={[styles.analyticsCard, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="location" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>{stats.donations.active}</Text>
                <Text style={styles.analyticsLabel}>{t('dashboard.admin.activeNow')}</Text>
                <Text style={styles.analyticsSubLabel}>{t('dashboard.admin.liveDonations')}</Text>
              </View>
            </View>

            <View style={styles.metricsSection}>
              <Text style={styles.cardTitle}>{t('dashboard.admin.keyMetrics')}</Text>
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.metricTitle}>{t('dashboard.admin.platformAdoption')}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.users.total} {t('dashboard.admin.registeredOrgs')}
                </Text>
              </View>
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                  <Text style={styles.metricTitle}>{t('dashboard.admin.responseTime')}</Text>
                </View>
                <Text style={styles.metricValue}>
                  {t('dashboard.admin.avgPickup')}
                </Text>
              </View>
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  statsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 75,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#2563eb',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  tabContent: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  overviewGrid: {
    gap: 12,
    marginBottom: 16,
  },
  overviewCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  cardContent: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statRowLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  progressItem: {
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  userCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userHeader: {
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'column',
    gap: 8,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  userDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 4,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  analyticsGrid: {
    gap: 10,
    marginBottom: 16,
  },
  analyticsCard: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 6,
  },
  analyticsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
    textAlign: 'center',
  },
  analyticsSubLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
    textAlign: 'center',
  },
  metricsSection: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  metricValue: {
    fontSize: 11,
    color: '#6b7280',
  },
});