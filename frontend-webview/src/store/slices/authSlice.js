import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      console.log('🔐 LOGIN REQUEST:', { email });
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ LOGIN RESPONSE:', response.data);
      console.log('👤 USER DATA RECEIVED:', response.data.user);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      console.error('❌ LOGIN ERROR:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/register', userData);
      localStorage.setItem('token', response.data.token);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🚀 logoutUser thunk called');
      const response = await api.post('/auth/logout');
      console.log('✅ Logout API response:', response.data);
      localStorage.removeItem('token');
      return true;
    } catch (error) {
      console.error('❌ Logout API failed:', error.response?.data || error.message);
      localStorage.removeItem('token'); // Remove token even if API fails
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      console.log('📝 UPDATE PROFILE REQUEST:', profileData);
      const response = await api.put('/auth/profile', profileData);
      console.log('✅ UPDATE PROFILE RESPONSE:', response.data);
      console.log('👤 UPDATED USER DATA:', response.data.user);
      return response.data;
    } catch (error) {
      console.error('❌ UPDATE PROFILE ERROR:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Profile update failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 LOADING USER PROFILE...');
      const response = await api.get('/auth/profile');
      console.log('✅ LOAD USER RESPONSE:', response.data);
      console.log('👤 LOADED USER DATA FIELDS:', Object.keys(response.data));
      console.log('📝 USER DETAILS:', {
        organization_name: response.data.organization_name,
        contact_person: response.data.contact_person,
        phone: response.data.phone,
        address: response.data.address,
        email: response.data.email,
        role: response.data.role,
        is_verified: response.data.is_verified
      });
      return response.data;
    } catch (error) {
      console.error('❌ LOAD USER ERROR:', error.response?.data || error.message);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to load user');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        console.log('📦 LOGIN FULFILLED - SETTING USER STATE:', action.payload.user);
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
        console.log('📋 CURRENT USER STATE:', state.user);
        
        // Check if user profile is incomplete (missing required fields)
        const user = action.payload.user;
        const requiredFields = ['contact_person', 'phone', 'address'];
        const missingFields = requiredFields.filter(field => !user[field]);
        
        if (missingFields.length > 0) {
          console.log('⚠️ USER PROFILE INCOMPLETE, MISSING:', missingFields);
          // The loadUser will be called by App.jsx useEffect
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update Profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        console.log('📦 UPDATE PROFILE FULFILLED - UPDATING USER STATE:', action.payload.user);
        state.isLoading = false;
        state.user = action.payload.user;
        console.log('📋 UPDATED USER STATE:', state.user);
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      .addCase(logoutUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      })
      // Load User
      .addCase(loadUser.fulfilled, (state, action) => {
        console.log('📦 LOAD USER FULFILLED - SETTING USER STATE:', action.payload);
        state.user = action.payload;
        state.isAuthenticated = true;
        console.log('📋 LOADED USER STATE:', state.user);
      })
      .addCase(loadUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;