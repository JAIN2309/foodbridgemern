import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getQueue, clearQueue, queueSize } from '../utils/offlineQueue';
import api from '../services/api';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync queued actions to server
  const syncQueue = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    try {
      // Convert offline queue format to backend sync format
      const pending_actions = queue.map(action => {
        if (action.type === 'claim_donation') {
          return { action: 'claim_donation', data: { donationId: action.donationId } };
        }
        if (action.type === 'mark_collected') {
          return { action: 'mark_collected', data: { donationId: action.donationId } };
        }
        if (action.type === 'release_donation') {
          return { action: 'release_donation', data: { donationId: action.donationId, reason: action.reason } };
        }
        return null;
      }).filter(Boolean);

      if (pending_actions.length > 0) {
        await api.post('/donations/sync-offline', { pending_actions });
      }

      // Handle create_donation separately (needs FormData)
      const createActions = queue.filter(a => a.type === 'create_donation');
      for (const action of createActions) {
        if (action.type === 'create_donation') {
          try {
            await api.post('/donations', action.payload);
          } catch {
            // Individual failure — log but continue
          }
        }
      }

      await clearQueue();
      setPendingCount(0);
    } catch (error) {
      // Sync failed — keep queue for next reconnection
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    // Initial queue count
    queueSize().then(setPendingCount);

    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);

      if (online) {
        // Auto-sync on reconnection
        queueSize().then(count => {
          if (count > 0) syncQueue();
        });
      }
    });

    return () => unsubscribe();
  }, [syncQueue]);

  const refreshPendingCount = useCallback(async () => {
    const count = await queueSize();
    setPendingCount(count);
  }, []);

  return { isOnline, pendingCount, isSyncing, syncQueue, refreshPendingCount };
};
