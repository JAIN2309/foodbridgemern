import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useAppDispatch, useAppSelector } from '../hooks/useRedux';
import { fetchNearbyDonations, claimDonation, fetchClaimedDonations } from '../store/donationSlice';
import { useLocation } from '../hooks/useLocation';
import Toast from 'react-native-toast-message';

export default function NGODashboard() {
  const dispatch = useAppDispatch();
  const { donations, claimedDonations, isLoading } = useAppSelector((state) => state.donations);
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
        <Text style={styles.title}>NGO Dashboard</Text>
        <Text style={styles.subtitle}>Browse and claim donations</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
          onPress={() => setActiveTab('feed')}
        >
          <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Live Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'map' && styles.activeTab]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.activeTabText]}>Map</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'claims' && styles.activeTab]}
          onPress={() => setActiveTab('claims')}
        >
          <Text style={[styles.tabText, activeTab === 'claims' && styles.activeTabText]}>My Claims</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'feed' && (
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {donations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No donations available</Text>
            </View>
          ) : (
            donations.map((donation) => (
              <View key={donation._id} style={styles.donationCard}>
                <View style={styles.donationHeader}>
                  <Text style={styles.donationTitle}>
                    {donation.food_items.map(item => item.name).join(', ')}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(donation.status) }]}>
                    <Text style={styles.statusText}>{donation.status}</Text>
                  </View>
                </View>
                <Text style={styles.donationDetail}>
                  <Ionicons name="people" size={14} /> Serves: {donation.quantity_serves} people
                </Text>
                <Text style={styles.donationDetail}>
                  <Ionicons name="business" size={14} /> {donation.donor_id.organization_name}
                </Text>
                <Text style={styles.donationDetail}>
                  <Ionicons name="location" size={14} /> {donation.pickup_address}
                </Text>
                {donation.status === 'available' && (
                  <TouchableOpacity 
                    style={styles.claimButton}
                    onPress={() => handleClaim(donation._id)}
                  >
                    <Text style={styles.claimButtonText}>Claim Donation</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {activeTab === 'map' && location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        >
          {donations.map((donation) => (
            <Marker
              key={donation._id}
              coordinate={{
                latitude: donation.coordinates[1],
                longitude: donation.coordinates[0],
              }}
              title={donation.food_items.map(item => item.name).join(', ')}
              description={`Serves ${donation.quantity_serves} people`}
            />
          ))}
        </MapView>
      )}

      {activeTab === 'claims' && (
        <ScrollView 
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {claimedDonations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="clipboard-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No claimed donations</Text>
            </View>
          ) : (
            claimedDonations.map((donation) => (
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
                <Text style={styles.donationDetail}>From: {donation.donor_id.organization_name}</Text>
                <Text style={styles.donationDetail}>Address: {donation.pickup_address}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
  map: {
    flex: 1,
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
    marginBottom: 12,
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
  claimButton: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
