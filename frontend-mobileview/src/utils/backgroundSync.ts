import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import NetInfo from '@react-native-community/netinfo';
import { Platform } from 'react-native';
import { getQueue, clearQueue } from './offlineQueue';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const BACKGROUND_SYNC_TASK = 'foodbridge-offline-sync';
const TOKEN_KEY = 'token';
const API_BASE_KEY = 'api_base';

// Define the background task — Android WorkManager runs this even when app is closed
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    // Only run on Android (iOS background fetch unreliable when force-killed)
    if (Platform.OS !== 'android') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check connectivity
    const state = await NetInfo.fetch();
    if (!state.isConnected || !state.isInternetReachable) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Check queue
    const queue = await getQueue();
    if (queue.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get auth token
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return BackgroundFetch.BackgroundFetchResult.Failed;

    const apiBase = await AsyncStorage.getItem(API_BASE_KEY);
    if (!apiBase) return BackgroundFetch.BackgroundFetchResult.Failed;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Sync claim/collect/release actions
    const syncActions = queue
      .filter(a => a.type !== 'create_donation')
      .map(action => {
        if (action.type === 'claim_donation')
          return { action: 'claim_donation', data: { donationId: action.donationId } };
        if (action.type === 'mark_collected')
          return { action: 'mark_collected', data: { donationId: action.donationId } };
        if (action.type === 'release_donation')
          return { action: 'release_donation', data: { donationId: action.donationId, reason: action.reason } };
        return null;
      })
      .filter(Boolean);

    if (syncActions.length > 0) {
      const res = await fetch(`${apiBase}/donations/sync-offline`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ pending_actions: syncActions }),
      });
      if (!res.ok) return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Post queued donations (no photo in background)
    for (const action of queue.filter(a => a.type === 'create_donation')) {
      if (action.type === 'create_donation') {
        try {
          await fetch(`${apiBase}/donations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(action.payload),
          });
        } catch {}
      }
    }

    await clearQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;

  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export const registerBackgroundSync = async (): Promise<void> => {
  if (Platform.OS !== 'android') return; // Android only

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (
      status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
      status === BackgroundFetch.BackgroundFetchStatus.Denied
    ) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 5 * 60,   // 5 minutes — Android WorkManager respects this
        stopOnTerminate: false,     // keeps running after app is swiped away
        startOnBoot: true,          // resumes after phone restart
      });
    }
  } catch {}
};

export const storeApiBase = async (url: string): Promise<void> => {
  await AsyncStorage.setItem(API_BASE_KEY, url);
};

export const unregisterBackgroundSync = async (): Promise<void> => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (isRegistered) await BackgroundFetch.unregisterTaskAsync(BACKGROUND_SYNC_TASK);
  } catch {}
};
