import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../services/api';

// Show alerts for real notifications, suppress silent ones
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isSilent = notification.request.content.data?.type === 'silent_sync';
    return {
      shouldShowAlert: !isSilent,
      shouldPlaySound: !isSilent,
      shouldSetBadge: false,
    };
  },
});

export const registerPushToken = async (): Promise<void> => {
  // Android only for now — iOS needs Apple Developer account for APNs
  if (Platform.OS !== 'android') return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    // Android notification channels
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FoodBridge Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('silent', {
      name: 'Background Sync',
      importance: Notifications.AndroidImportance.MIN,
      enableVibrate: false,
      showBadge: false,
    });

    // Get Expo push token (works with FCM on Android without Apple account)
    const tokenData = await Notifications.getExpoPushTokenAsync();
    if (tokenData?.data) {
      await api.put('/auth/push-token', { push_token: tokenData.data });
    }
  } catch {
    // Non-fatal — app works without push
  }
};

// Listen for incoming notifications — handles silent sync trigger
export const setupPushListeners = (onSilentSync: () => void) => {
  const sub1 = Notifications.addNotificationReceivedListener((notification) => {
    if (notification.request.content.data?.type === 'silent_sync') {
      onSilentSync();
    }
  });

  const sub2 = Notifications.addNotificationResponseReceivedListener(() => {
    // User tapped a notification — refresh data
    onSilentSync();
  });

  return () => {
    sub1.remove();
    sub2.remove();
  };
};
