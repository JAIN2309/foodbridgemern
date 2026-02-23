import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';
import { DonationState, Donation } from '../types';

export const fetchNearbyDonations = createAsyncThunk(
  'donations/fetchNearby',
  async ({ latitude, longitude }: { latitude: number; longitude: number }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/donations/nearby?latitude=${latitude}&longitude=${longitude}`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch donations');
    }
  }
);

export const createDonation = createAsyncThunk(
  'donations/create',
  async (donationData: any, { rejectWithValue }) => {
    try {
      const response = await api.post('/donations', donationData);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create donation');
    }
  }
);

export const fetchDonorHistory = createAsyncThunk(
  'donations/fetchDonorHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/donations/history/donor');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch history');
    }
  }
);

export const claimDonation = createAsyncThunk(
  'donations/claim',
  async (donationId: string, { rejectWithValue }) => {
    try {
      const response = await api.put(`/donations/${donationId}/claim`);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to claim donation');
    }
  }
);

export const fetchClaimedDonations = createAsyncThunk(
  'donations/fetchClaimed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/donations/history/ngo');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch claims');
    }
  }
);

const initialState: DonationState = {
  donations: [],
  userDonations: [],
  claimedDonations: [],
  isLoading: false,
  error: null,
};

const donationSlice = createSlice({
  name: 'donations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNearbyDonations.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchNearbyDonations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.donations = action.payload;
      })
      .addCase(fetchNearbyDonations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createDonation.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createDonation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.userDonations.unshift(action.payload);
      })
      .addCase(createDonation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDonorHistory.fulfilled, (state, action) => {
        state.userDonations = action.payload;
      })
      .addCase(claimDonation.fulfilled, (state, action) => {
        state.donations = state.donations.filter(d => d._id !== action.payload._id);
        state.claimedDonations.unshift(action.payload);
      })
      .addCase(fetchClaimedDonations.fulfilled, (state, action) => {
        state.claimedDonations = action.payload;
      });
  },
});

export const { clearError } = donationSlice.actions;
export default donationSlice.reducer;
