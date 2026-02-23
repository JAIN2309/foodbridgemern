import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        text1: 'Failed to fetch data',
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
        text1: `User ${approved ? 'approved' : 'rejected'} successfully`
      });
      fetchData();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to update user status'
      });
    }
  };

  const confirmVerification = (userId: string, approved: boolean, userName: string) => {
    Alert.alert(
      `${approved ? 'Approve' : 'Reject'} User`,
      `Are you sure you want to ${approved ? 'approve' : 'reject'} ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: approved ? 'Approve' : 'Reject', 
          onPress: () => handleVerifyUser(userId, approved),
          style: approved ? 'default' : 'destructive'
        }
      ]
    );
  };

  const getStatusColor = (isVerified: boolean) => {
    return isVerified ? '#10b981' : '#f59e0b';
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
        <Text style={styles.title}>Admin Dashboard</Text>
        <Text style={styles.subtitle}>Manage users and monitor platform</Text>
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
          <Text style={styles.statLabel}>Total Users</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.users.verified}</Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.users.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="restaurant" size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats.meals_served}</Text>
          <Text style={styles.statLabel}>Meals Served</Text>
        </View>
      </ScrollView>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'verify' && styles.activeTab]}
          onPress={() => setActiveTab('verify')}
        >
          <Text style={[styles.tabText, activeTab === 'verify' && styles.activeTabText]}>
            Verify ({pendingUsers.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.activeTab]}
          onPress={() => setActiveTab('users')}
        >
          <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
            All Users
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Analytics
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
            <Text style={styles.loadingText}>Loading dashboard data...</Text>
          </View>
        )}

        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.cardTitle}>Donation Statistics</Text>
                <View style={styles.cardContent}>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Total Donations:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Active:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.active}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Completed:</Text>
                    <Text style={styles.statRowValue}>{stats.donations.completed}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.overviewCard}>
                <Text style={styles.cardTitle}>User Statistics</Text>
                <View style={styles.cardContent}>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Total Users:</Text>
                    <Text style={styles.statRowValue}>{stats.users.total}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Verified:</Text>
                    <Text style={styles.statRowValue}>{stats.users.verified}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statRowLabel}>Pending:</Text>
                    <Text style={styles.statRowValue}>{stats.users.pending}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.progressSection}>
              <Text style={styles.cardTitle}>Platform Health</Text>
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>User Verification Rate</Text>
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
                  {stats.users.verified} of {stats.users.total} verified
                </Text>
              </View>
              
              <View style={styles.progressItem}>
                <Text style={styles.progressLabel}>Donation Success Rate</Text>
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
                  {stats.donations.completed} of {stats.donations.total} completed
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'verify' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Pending User Verifications</Text>
            {pendingUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No pending verifications</Text>
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
                      <Text style={styles.buttonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => confirmVerification(user._id, false, user.organization_name)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                      <Text style={styles.buttonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'users' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>All Users ({allUsers.length})</Text>
            {allUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No users found</Text>
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
                            {user.is_verified ? 'Verified' : 'Pending'}
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
                        Joined {new Date(user.createdAt).toLocaleDateString()}
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
            <Text style={styles.sectionTitle}>Platform Analytics</Text>
            
            <View style={styles.analyticsGrid}>
              <View style={[styles.analyticsCard, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="people" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>{stats.meals_served}</Text>
                <Text style={styles.analyticsLabel}>Total Impact</Text>
                <Text style={styles.analyticsSubLabel}>Meals Served</Text>
              </View>
              
              <View style={[styles.analyticsCard, { backgroundColor: '#10b981' }]}>
                <Ionicons name="trending-up" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>
                  {stats.donations.total ? 
                    Math.round((stats.donations.completed / stats.donations.total) * 100) : 0}%
                </Text>
                <Text style={styles.analyticsLabel}>Success Rate</Text>
                <Text style={styles.analyticsSubLabel}>Completion Rate</Text>
              </View>
              
              <View style={[styles.analyticsCard, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="location" size={32} color="#fff" />
                <Text style={styles.analyticsValue}>{stats.donations.active}</Text>
                <Text style={styles.analyticsLabel}>Active Now</Text>
                <Text style={styles.analyticsSubLabel}>Live Donations</Text>
              </View>
            </View>

            <View style={styles.metricsSection}>
              <Text style={styles.cardTitle}>Key Metrics</Text>
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={styles.metricTitle}>Platform Adoption</Text>
                </View>
                <Text style={styles.metricValue}>
                  {stats.users.total} registered organizations
                </Text>
              </View>
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                  <Text style={styles.metricTitle}>Response Time</Text>
                </View>
                <Text style={styles.metricValue}>
                  Average pickup within 2 hours
                </Text>
              </View>
              
              <View style={styles.metricItem}>
                <View style={styles.metricHeader}>
                  <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
                  <Text style={styles.metricTitle}>Trust Score</Text>
                </View>
                <Text style={styles.metricValue}>
                  {Math.round((stats.users.verified / Math.max(stats.users.total, 1)) * 100)}% verified users
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
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  statsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 16,
  },
  statsContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 100,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
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
    gap: 16,
    marginBottom: 24,
  },
  overviewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
    fontSize: 14,
    color: '#6b7280',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  userHeader: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  badgeContainer: {
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  roleText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  userDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  analyticsGrid: {
    gap: 16,
    marginBottom: 24,
  },
  analyticsCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
  },
  analyticsLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  analyticsSubLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  metricsSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  metricItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  metricValue: {
    fontSize: 13,
    color: '#6b7280',
  },
});