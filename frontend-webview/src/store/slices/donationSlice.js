import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const fetchNearbyDonations = createAsyncThunk(
  'donations/fetchNearby',
  async ({ longitude, latitude, maxDistance }, { rejectWithValue }) => {
    try {
      console.log('fetchNearbyDonations called with:', { longitude, latitude, maxDistance });
      const response = await api.get('/donations/nearby', {
        params: { longitude, latitude, maxDistance }
      });
      console.log('fetchNearbyDonations response:', response.data);
      return response.data;
    } catch (error) {
      console.error('fetchNearbyDonations error:', error);
      return rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createDonation = createAsyncThunk(
  'donations/create',
  async (donationData, { rejectWithValue }) => {
    try {
      const response = await api.post('/donations', donationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const claimDonation = createAsyncThunk(
  'donations/claim',
  async (donationId, { rejectWithValue }) => {
    try {
      const response = await api.post(`/donations/${donationId}/claim`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const fetchDonorHistory = createAsyncThunk(
  'donations/fetchDonorHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/donations/history/donor');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

export const fetchNGOHistory = createAsyncThunk(
  'donations/fetchNGOHistory',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/donations/history/ngo');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data.message);
    }
  }
);

const donationSlice = createSlice({
  name: 'donations',
  initialState: {
    nearbyDonations: [],
    userDonations: [],
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNewDonation: (state, action) => {
      state.nearbyDonations.unshift(action.payload);
    },
    updateDonationStatus: (state, action) => {
      const { donationId, status, claimed_by } = action.payload;
      const donation = state.nearbyDonations.find(d => d._id === donationId);
      if (donation) {
        donation.status = status;
        if (claimed_by) donation.claimed_by = claimed_by;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch nearby donations
      .addCase(fetchNearbyDonations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNearbyDonations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.nearbyDonations = action.payload;
      })
      .addCase(fetchNearbyDonations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create donation
      .addCase(createDonation.fulfilled, (state, action) => {
        state.userDonations.unshift(action.payload);
      })
      // Claim donation
      .addCase(claimDonation.fulfilled, (state, action) => {
        const donationId = action.payload.donation._id;
        const donation = state.nearbyDonations.find(d => d._id === donationId);
        if (donation) {
          donation.status = 'reserved';
          donation.claimed_by = action.payload.donation.claimed_by;
        }
      })
      // Fetch histories
      .addCase(fetchDonorHistory.fulfilled, (state, action) => {
        state.userDonations = action.payload;
      })
      .addCase(fetchNGOHistory.fulfilled, (state, action) => {
        state.userDonations = action.payload;
      });
  },
});

export const { clearError, addNewDonation, updateDonationStatus } = donationSlice.actions;
export default donationSlice.reducer;