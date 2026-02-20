import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { createDonation, fetchDonorHistory } from '../store/donationSlice';
import { useLocation } from '../hooks/useLocation';
import Toast from 'react-native-toast-message';

export default function DonorDashboard() {
  const dispatch = useAppDispatch();
  const { userDonations, isLoading } = useAppSelector((state) => state.donations);
  const { location } = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  const [formData, setFormData] = useState({
    food_items: '',
    food_category: 'vegetarian',
    quantity_serves: '',
    pickup_address: '',
    pickup_window_start: '',
    pickup_window_end: '',
    special_instructions: '',
  });

  useEffect(() => {
    dispatch(fetchDonorHistory());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDonorHistory());
    setRefreshing(false);
  };

  const handleSubmit = async () => {
    if (!location) {
      Toast.show({ type: 'error', text1: 'Location access required' });
      return;
    }

    const donationData = {
      ...formData,
      quantity_serves: parseInt(formData.quantity_serves),
      coordinates: [location.longitude, location.latitude],
      food_items: formData.food_items.split(',').map(item => ({
        name: item.trim(),
        category: formData.food_category,
      })),
      photo_url: 'https://via.placeholder.com/400x300',
    };

    try {
      await dispatch(createDonation(donationData)).unwrap();
      Toast.show({ type: 'success', text1: 'Donation posted!' });
      setFormData({
        food_items: '',
        food_category: 'vegetarian',
        quantity_serves: '',
        pickup_address: '',
        pickup_window_start: '',
        pickup_window_end: '',
        special_instructions: '',
      });
      setActiveTab('overview');
    } catch (error: any) {
      Toast.show({ type: 'error', text1: error || 'Failed to post' });
    }
  };

  const stats = {
    total: userDonations.length,
    active: userDonations.filter(d => d.status === 'available').length,
    completed: userDonations.filter(d => d.status === 'collected').length,
    totalServed: userDonations
      .filter(d => d.status === 'collected')
      .reduce((sum, d) => sum + d.quantity_serves, 0),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'reserved': return '#f59e0b';
      case 'collected': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Donor Dashboard</Text>
        <Text style={styles.subtitle}>Manage your donations</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="add-circle" size={24} color="#3b82f6" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="time" size={24} color="#10b981" />
          <Text style={styles.statValue}>{stats.active}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={24} color="#8b5cf6" />
          <Text style={styles.statValue}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#f59e0b" />
          <Text style={styles.statValue}>{stats.totalServed}</Text>
          <Text style={styles.statLabel}>Served</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'post' && styles.activeTab]}
          onPress={() => setActiveTab('post')}
        >
          <Text style={[styles.tabText, activeTab === 'post' && styles.activeTabText]}>Post Food</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'overview' && (
          <View>
            {userDonations.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="fast-food-outline" size={64} color="#d1d5db" />
                <Text style={styles.emptyText}>No donations yet</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={() => setActiveTab('post')}>
                  <Text style={styles.emptyButtonText}>Post Food</Text>
                </TouchableOpacity>
              </View>
            ) : (
              userDonations.map((donation) => (
                <View key={donation._id} style={styles.donationCard}>
                  <View style={styles.donationHeader}>
                    <Text style={styles.donationTitle}>
                      {donation.food_items.map(item => item.name).join(', ')}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(donation.status) }]}>
                      <Text style={styles.statusText}>{donation.status}</Text>
                    </View>
                  </View>
                  <Text style={styles.donationDetail}>Serves: {donation.quantity_serves} people</Text>
                  <Text style={styles.donationDetail}>
                    {new Date(donation.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'post' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Food Items (comma separated)"
              value={formData.food_items}
              onChangeText={(text) => setFormData({ ...formData, food_items: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantity (serves)"
              value={formData.quantity_serves}
              onChangeText={(text) => setFormData({ ...formData, quantity_serves: text })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              placeholder="Pickup Address"
              value={formData.pickup_address}
              onChangeText={(text) => setFormData({ ...formData, pickup_address: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Special Instructions"
              value={formData.special_instructions}
              onChangeText={(text) => setFormData({ ...formData, special_instructions: text })}
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Post Donation</Text>
              )}
            </TouchableOpacity>
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
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
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
    padding: 16,
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
  emptyButton: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  donationCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  donationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  donationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  donationDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
