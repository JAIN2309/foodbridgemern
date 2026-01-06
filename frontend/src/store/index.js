import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import donationSlice from './slices/donationSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    donations: donationSlice,
  },
});

export default store;