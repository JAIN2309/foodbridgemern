import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../src/hooks/useRedux';

export default function ProfileScreen() {
  const { user } = useAppSelector((state) => state.auth);

  if (!user) return null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
        <Text style={styles.name}>{user.organization_name}</Text>
        <Text style={styles.role}>{user.role.toUpperCase()}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.infoRow}>
          <Ionicons name="mail" size={20} color="#6b7280" />
          <Text style={styles.infoText}>{user.email}</Text>
        </View>
        {user.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{user.phone}</Text>
          </View>
        )}
        {user.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{user.address}</Text>
          </View>
        )}
        {user.contact_person && (
          <View style={styles.infoRow}>
            <Ionicons name="person" size={20} color="#6b7280" />
            <Text style={styles.infoText}>{user.contact_person}</Text>
          </View>
        )}
      </View>

      {user.trust_score !== undefined && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trust Score</Text>
          <View style={styles.trustScore}>
            <Text style={styles.trustScoreValue}>{user.trust_score}/100</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${user.trust_score}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.statusBadge}>
          <Ionicons 
            name={user.is_verified ? 'checkmark-circle' : 'time'} 
            size={20} 
            color={user.is_verified ? '#10b981' : '#f59e0b'} 
          />
          <Text style={[
            styles.statusText,
            { color: user.is_verified ? '#10b981' : '#f59e0b' }
          ]}>
            {user.is_verified ? 'Verified' : 'Pending Verification'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  trustScore: {
    alignItems: 'center',
  },
  trustScoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2563eb',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
