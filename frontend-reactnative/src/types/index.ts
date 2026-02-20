export interface User {
  id: string;
  email: string;
  role: 'donor' | 'ngo' | 'admin';
  organization_name: string;
  contact_person: string;
  phone: string;
  address: string;
  is_verified: boolean;
  trust_score?: number;
  ratings?: {
    average: number;
    count: number;
    reviews?: Array<{
      rating: number;
      comment?: string;
      created_at: string;
    }>;
  };
  activity_stats?: {
    successful_pickups: number;
    failed_pickups: number;
  };
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
