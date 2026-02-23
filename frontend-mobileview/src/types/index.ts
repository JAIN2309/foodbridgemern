export interface User {
  _id: string;
  id?: string; // For backward compatibility
  email: string;
  role: 'donor' | 'ngo' | 'admin' | 'super_admin';
  organization_name: string;
  license_number?: string;
  contact_person: string;
  phone: string;
  address: string;
  is_verified: boolean;
  location: {
    type: string;
    coordinates: [number, number];
  };
  verification_documents?: string[];
  trust_score?: number;
  ratings?: {
    average: number;
    count: number;
    reviews?: Array<{
      reviewer_id: string;
      rating: number;
      comment?: string;
      created_at: string;
    }>;
  };
  activity_stats?: {
    donations_posted: number;
    donations_claimed: number;
    successful_pickups: number;
    failed_pickups: number;
    response_time_avg: number;
  };
  offline_mode?: {
    enabled: boolean;
    last_sync: string;
    pending_actions: Array<{
      action: string;
      data: any;
      timestamp: string;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodItem {
  name: string;
  category: string;
}

export interface Donation {
  _id: string;
  donor_id: User;
  food_items: FoodItem[];
  food_category: string;
  quantity_serves: number;
  pickup_address: string;
  coordinates: [number, number];
  pickup_window_start: string;
  pickup_window_end: string;
  special_instructions?: string;
  photo_url: string;
  status: 'available' | 'reserved' | 'collected' | 'expired';
  claimed_by?: User;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

export interface DonationState {
  donations: Donation[];
  userDonations: Donation[];
  claimedDonations: Donation[];
  isLoading: boolean;
  error: string | null;
}
