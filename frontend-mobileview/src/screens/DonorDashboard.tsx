import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl, Platform, KeyboardAvoidingView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
    special_instructions: '',
    storage_conditions: 'refrigerated',
  });
  
  const [dates, setDates] = useState({
    pickup_start: new Date(),
    pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
    preparation_time: new Date(),
    expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  
  const [showPicker, setShowPicker] = useState({ field: '', show: false });

  useEffect(() => {
    dispatch(fetchDonorHistory());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchDonorHistory());
    setRefreshing(false);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dates[showPicker.field as keyof typeof dates];
    setShowPicker({ field: '', show: false });
    
    if (event.type === 'set' && selectedDate) {
      setDates({ ...dates, [showPicker.field]: selectedDate });
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      pickup_window_start: dates.pickup_start.toISOString(),
      pickup_window_end: dates.pickup_end.toISOString(),
      food_items: formData.food_items.split(',').map(item => ({
        name: item.trim(),
        category: formData.food_category,
        storage_conditions: formData.storage_conditions,
        preparation_time: dates.preparation_time.toISOString(),
        expiry_date: dates.expiry_date.toISOString(),
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
        special_instructions: '',
        storage_conditions: 'refrigerated',
      });
      setDates({
        pickup_start: new Date(),
        pickup_end: new Date(Date.now() + 2 * 60 * 60 * 1000),
        preparation_time: new Date(),
        expiry_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 20}
    >
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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Items</Text>
              <TextInput
                style={styles.input}
                placeholder="Rice, Dal, Vegetables (comma separated)"
                value={formData.food_items}
                onChangeText={(text) => setFormData({ ...formData, food_items: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Quantity (serves)</Text>
              <TextInput
                style={styles.input}
                placeholder="Number of people it serves"
                value={formData.quantity_serves}
                onChangeText={(text) => setFormData({ ...formData, quantity_serves: text })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pickup Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Full pickup address"
                value={formData.pickup_address}
                onChangeText={(text) => setFormData({ ...formData, pickup_address: text })}
              />
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Pickup Start</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => {
                    setShowPicker({ field: 'pickup_start', show: true });
                  }}
                >
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.dateText}>{formatDateTime(dates.pickup_start)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Pickup End</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowPicker({ field: 'pickup_end', show: true })}
                >
                  <Ionicons name="time-outline" size={16} color="#6b7280" />
                  <Text style={styles.dateText}>{formatDateTime(dates.pickup_end)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.dateRow}>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Prepared At</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowPicker({ field: 'preparation_time', show: true })}
                >
                  <Ionicons name="restaurant-outline" size={16} color="#6b7280" />
                  <Text style={styles.dateText}>{formatDateTime(dates.preparation_time)}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.dateGroup}>
                <Text style={styles.label}>Expires At</Text>
                <TouchableOpacity 
                  style={styles.dateButton}
                  onPress={() => setShowPicker({ field: 'expiry_date', show: true })}
                >
                  <Ionicons name="warning-outline" size={16} color="#6b7280" />
                  <Text style={styles.dateText}>{formatDateTime(dates.expiry_date)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Storage Conditions</Text>
              <View style={styles.picker}>
                <TouchableOpacity 
                  style={[styles.pickerOption, formData.storage_conditions === 'refrigerated' && styles.selectedOption]}
                  onPress={() => setFormData({ ...formData, storage_conditions: 'refrigerated' })}
                >
                  <Ionicons name="snow-outline" size={16} color={formData.storage_conditions === 'refrigerated' ? '#fff' : '#6b7280'} />
                  <Text style={[styles.pickerText, formData.storage_conditions === 'refrigerated' && styles.selectedText]}>Cold</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerOption, formData.storage_conditions === 'frozen' && styles.selectedOption]}
                  onPress={() => setFormData({ ...formData, storage_conditions: 'frozen' })}
                >
                  <Ionicons name="cube-outline" size={16} color={formData.storage_conditions === 'frozen' ? '#fff' : '#6b7280'} />
                  <Text style={[styles.pickerText, formData.storage_conditions === 'frozen' && styles.selectedText]}>Frozen</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.pickerOption, formData.storage_conditions === 'room_temperature' && styles.selectedOption]}
                  onPress={() => setFormData({ ...formData, storage_conditions: 'room_temperature' })}
                >
                  <Ionicons name="thermometer-outline" size={16} color={formData.storage_conditions === 'room_temperature' ? '#fff' : '#6b7280'} />
                  <Text style={[styles.pickerText, formData.storage_conditions === 'room_temperature' && styles.selectedText]}>Room</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Special Instructions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any special handling instructions..."
                value={formData.special_instructions}
                onChangeText={(text) => setFormData({ ...formData, special_instructions: text })}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Post Donation</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {showPicker.show && showPicker.field && (
          <DateTimePicker
            value={dates[showPicker.field as keyof typeof dates]}
            mode="datetime"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    padding: 20,
    borderRadius: 16,
    margin: 4,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  dateGroup: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  picker: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    overflow: 'hidden',
  },
  pickerOption: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  selectedOption: {
    backgroundColor: '#2563eb',
  },
  pickerText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  selectedText: {
    color: '#fff',
  },
  formContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
});