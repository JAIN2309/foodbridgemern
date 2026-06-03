import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'foodbridge_offline_queue';

export type OfflineAction =
  | { type: 'claim_donation';    donationId: string; timestamp: number }
  | { type: 'mark_collected';    donationId: string; timestamp: number }
  | { type: 'release_donation';  donationId: string; reason: string; timestamp: number }
  | { type: 'create_donation';   payload: Record<string, any>; timestamp: number };

export const enqueue = async (action: Omit<OfflineAction, 'timestamp'>): Promise<void> => {
  const queue = await getQueue();
  queue.push({ ...action, timestamp: Date.now() } as OfflineAction);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = async (): Promise<OfflineAction[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearQueue = async (): Promise<void> => {
  await AsyncStorage.removeItem(QUEUE_KEY);
};

export const queueSize = async (): Promise<number> => {
  const q = await getQueue();
  return q.length;
};

// Cache nearby donations for offline browsing
const NEARBY_CACHE_KEY = 'foodbridge_nearby_cache';

export const cacheNearbyDonations = async (donations: any[]): Promise<void> => {
  await AsyncStorage.setItem(NEARBY_CACHE_KEY, JSON.stringify({ donations, cachedAt: Date.now() }));
};

export const getCachedNearbyDonations = async (): Promise<{ donations: any[]; cachedAt: number } | null> => {
  try {
    const raw = await AsyncStorage.getItem(NEARBY_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
