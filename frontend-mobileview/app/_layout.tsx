import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Provider } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { store } from '../src/store';
import '../src/i18n';
import { useAppSelector, useAppDispatch } from '../src/hooks/useRedux';
import { setToken, loadUser } from '../src/store/authSlice';
import { registerBackgroundSync, storeApiBase } from '../src/utils/backgroundSync';
import { registerPushToken, setupPushListeners } from '../src/utils/pushNotifications';
import { API_BASE_URL } from '../src/services/api';
import { getQueue, clearQueue } from '../src/utils/offlineQueue';
import api from '../src/services/api';

function RootLayoutNav() {
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, token } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    const loadToken = async () => {
      const storedToken = await SecureStore.getItemAsync('token');
      if (storedToken) {
        dispatch(setToken(storedToken));
        dispatch(loadUser());
      }
      setIsNavigationReady(true);
    };
    loadToken();

    // Register background sync task — works even when app is closed
    registerBackgroundSync();
    storeApiBase(API_BASE_URL);

    // Register for push notifications → stores token in backend
    registerPushToken();

    // Handle silent push from server (fires after sync completes)
    const unsubscribe = setupPushListeners(async () => {
      // Server told us to refresh — drain any remaining queue
      const queue = await getQueue();
      if (queue.length > 0) {
        const pending = queue
          .filter(a => a.type !== 'create_donation')
          .map(a => {
            if (a.type === 'claim_donation') return { action: 'claim_donation', data: { donationId: a.donationId } };
            if (a.type === 'mark_collected') return { action: 'mark_collected', data: { donationId: a.donationId } };
            if (a.type === 'release_donation') return { action: 'release_donation', data: { donationId: a.donationId, reason: a.reason } };
            return null;
          })
          .filter(Boolean);
        if (pending.length > 0) {
          try { await api.post('/donations/sync-offline', { pending_actions: pending }); } catch {}
        }
        await clearQueue();
      }
    });
    return unsubscribe;
  }, []);

  // Check for incomplete profile and reload if needed
  useEffect(() => {
    const { user, token } = store.getState().auth;
    if (token && user) {
      const requiredFields = ['contact_person', 'phone', 'address'];
      const missingFields = requiredFields.filter(field => !user[field]);
      
      if (missingFields.length > 0) {
        dispatch(loadUser());
      }
    }
  }, []);

  useEffect(() => {
    if (!isNavigationReady || !navigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSplash = segments[0] === 'splash';

    if (inSplash) return; // let splash handle its own navigation

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isNavigationReady, navigationState?.key]);

  if (!navigationState?.key) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
      <Toast />
    </Provider>
  );
}
