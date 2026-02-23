import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { Provider } from 'react-redux';
import * as SecureStore from 'expo-secure-store';
import Toast from 'react-native-toast-message';
import { store } from '../src/store';
import { useAppSelector, useAppDispatch } from '../src/hooks/useRedux';
import { setToken, loadUser } from '../src/store/authSlice';

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
  }, []);

  // Check for incomplete profile and reload if needed
  useEffect(() => {
    const { user, token } = store.getState().auth;
    if (token && user) {
      const requiredFields = ['contact_person', 'phone', 'address'];
      const missingFields = requiredFields.filter(field => !user[field]);
      
      if (missingFields.length > 0) {
        console.log('⚠️ INCOMPLETE PROFILE DETECTED, LOADING FULL DATA...');
        dispatch(loadUser());
      }
    }
  }, []);

  useEffect(() => {
    if (!isNavigationReady || !navigationState?.key) return;
    
    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, isNavigationReady, navigationState?.key]);

  if (!navigationState?.key) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
