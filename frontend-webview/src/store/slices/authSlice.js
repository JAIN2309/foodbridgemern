import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { biometricAPI } from '../../services/api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      if (response.data.biometric_enabled) {
        const hasLocalCredentials = localStorage.getItem(`biometric_${email}_password`);
        if (!hasLocalCredentials) {
          localStorage.setItem(`biometric_${email}_password`, password);
          localStorage.setItem(`biometric_${email}_email`, email);
        }
      }
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      if (data?.retryAfterMinutes) {
        return rejectWithValue(`Too many login attempts. Try again in ${data.retryAfterMinutes} minute${data.retryAfterMinutes > 1 ? 's' : ''}.`);
      }
      return rejectWithValue(data?.message || error.message || 'Login failed');
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
      const data = error.response?.data;
      if (error.response?.status === 429) {
        return rejectWithValue(data?.message || 'Too many registration attempts. Try again later.');
      }
      return rejectWithValue(data?.message || error.message || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('token');
      return true;
    } catch (error) {
      localStorage.removeItem('token');
      return rejectWithValue(error.response?.data?.message || 'Logout failed');
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Profile update failed');
    }
  }
);

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/profile');
      if (response.data.email) {
        const backendStatus = response.data.biometric_enabled;
        const hasLocalCredentials = localStorage.getItem(`biometric_${response.data.email}_password`);
        if (!backendStatus && hasLocalCredentials) {
          localStorage.removeItem(`biometric_${response.data.email}_credentialId`);
          localStorage.removeItem(`biometric_${response.data.email}_email`);
          localStorage.removeItem(`biometric_${response.data.email}_password`);
        }
      }
      return response.data;
    } catch (error) {
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
      .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profile_picture, ...userWithoutPhoto } = action.payload.user;
        state.user = userWithoutPhoto;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profile_picture, ...userWithoutPhoto } = action.payload.user;
        state.user = userWithoutPhoto;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(registerUser.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(updateProfile.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        const { profile_picture, ...userWithoutPhoto } = action.payload.user;
        state.user = userWithoutPhoto;
      })
      .addCase(updateProfile.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(logoutUser.fulfilled, (state) => { state.user = null; state.token = null; state.isAuthenticated = false; })
      .addCase(logoutUser.rejected, (state) => { state.user = null; state.token = null; state.isAuthenticated = false; })
      .addCase(loadUser.fulfilled, (state, action) => {
        const { profile_picture, ...userWithoutPhoto } = action.payload;
        state.user = userWithoutPhoto;
        state.isAuthenticated = true;
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
