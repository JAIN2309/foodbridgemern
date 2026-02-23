import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../src/hooks/useRedux';
import { updateProfile, loadUser } from '../../src/store/authSlice';

export default function ProfileScreen() {
  const { user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    organization_name: user?.organization_name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    contact_person: user?.contact_person || '',
  });

  // Load user profile on component mount
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  useEffect(() => {
    if (user && !isEditing) {
      setEditData({
        organization_name: user.organization_name || '',
        phone: user.phone || '',
        address: user.address || '',
        contact_person: user.contact_person || '',
      });
    }
  }, [user, isEditing]);

  if (!user) return null;

  const handleSave = async () => {
    try {
      await dispatch(updateProfile(editData)).unwrap();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleCancel = () => {
    setEditData({
      organization_name: user.organization_name || '',
      phone: user.phone || '',
      address: user.address || '',
      contact_person: user.contact_person || '',
    });
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color="#fff" />
        </View>
        {isEditing ? (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Organization Name</Text>
            <TextInput
              style={[styles.editInput, styles.highlightBorder]}
              value={editData.organization_name}
              onChangeText={(text) => setEditData({...editData, organization_name: text})}
              placeholder="Enter organization name"
            />
          </View>
        ) : (
          <Text style={styles.name}>{user.organization_name}</Text>
        )}
        <Text style={styles.role}>{user.role.toUpperCase()}</Text>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
        >
          <Ionicons name={isEditing ? "checkmark" : "pencil"} size={20} color="#fff" />
          <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
        
        {isEditing && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Organization Name</Text>
          {isEditing ? (
            <TextInput
              style={[styles.editInput, styles.highlightBorder]}
              value={editData.organization_name}
              onChangeText={(text) => setEditData({...editData, organization_name: text})}
              placeholder="Enter organization name"
            />
          ) : (
            <Text style={styles.fieldValue}>{user.organization_name}</Text>
          )}
        </View>

        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <Text style={styles.fieldValue}>{user.email}</Text>
          <Text style={styles.fieldNote}>Email cannot be changed</Text>
        </View>

        {(user.phone || isEditing) && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, styles.highlightBorder]}
                value={editData.phone}
                onChangeText={(text) => setEditData({...editData, phone: text})}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{user.phone}</Text>
            )}
          </View>
        )}
        
        {(user.address || isEditing) && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Address/Location</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, styles.highlightBorder, styles.multilineInput]}
                value={editData.address}
                onChangeText={(text) => setEditData({...editData, address: text})}
                placeholder="Enter full address"
                multiline
                numberOfLines={2}
              />
            ) : (
              <Text style={styles.fieldValue}>{user.address}</Text>
            )}
          </View>
        )}
        
        {(user.contact_person || isEditing) && (
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact Person</Text>
            {isEditing ? (
              <TextInput
                style={[styles.editInput, styles.highlightBorder]}
                value={editData.contact_person}
                onChangeText={(text) => setEditData({...editData, contact_person: text})}
                placeholder="Enter contact person name"
              />
            ) : (
              <Text style={styles.fieldValue}>{user.contact_person}</Text>
            )}
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

      {user.ratings && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
          <View style={styles.ratingContainer}>
            <View style={styles.ratingHeader}>
              <View style={styles.ratingScore}>
                <Ionicons name="star" size={24} color="#fbbf24" />
                <Text style={styles.ratingValue}>{user.ratings.average.toFixed(1)}</Text>
              </View>
              <Text style={styles.ratingCount}>({user.ratings.count} reviews)</Text>
            </View>
            {user.ratings.reviews && user.ratings.reviews.length > 0 && (
              <View style={styles.reviewsList}>
                {user.ratings.reviews.slice(0, 3).map((review, index) => (
                  <View key={index} style={styles.reviewItem}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.stars}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons 
                            key={i} 
                            name={i < review.rating ? "star" : "star-outline"} 
                            size={14} 
                            color="#fbbf24" 
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    {review.comment && (
                      <Text style={styles.reviewComment}>{review.comment}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {user.activity_stats && (user.role === 'donor' || user.role === 'ngo') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {user.role === 'donor' ? 'Donation Statistics' : 'Activity Statistics'}
          </Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="add-circle" size={20} color="#3b82f6" />
              <Text style={styles.statNumber}>{user.activity_stats.donations_posted || 0}</Text>
              <Text style={styles.statText}>Donations Posted</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.statNumber}>{user.activity_stats.successful_pickups || 0}</Text>
              <Text style={styles.statText}>Successful</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="close-circle" size={20} color="#ef4444" />
              <Text style={styles.statNumber}>{user.activity_stats.failed_pickups || 0}</Text>
              <Text style={styles.statText}>Failed</Text>
            </View>
          </View>
        </View>
      )}

      {user.role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Information</Text>
          <View style={styles.adminInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#10b981" />
              <Text style={styles.infoText}>System Administrator</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="id-card" size={20} color="#6b7280" />
              <Text style={styles.infoText}>Admin ID: {user._id || user.id}</Text>
            </View>
            {user.location && (
              <View style={styles.infoRow}>
                <Ionicons name="globe" size={20} color="#6b7280" />
                <Text style={styles.infoText}>Location: {user.location.coordinates[1].toFixed(4)}, {user.location.coordinates[0].toFixed(4)}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.infoText}>Full System Access</Text>
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
  ratingContainer: {
    alignItems: 'center',
  },
  ratingHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingScore: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  ratingCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  reviewsList: {
    width: '100%',
  },
  reviewItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stars: {
    flexDirection: 'row',
  },
  reviewDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  reviewComment: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 2,
  },
  adminInfo: {
    marginTop: 8,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  fieldNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  highlightBorder: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  multilineInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  editButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  editInput: {
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editInfoInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 12,
  },
});
