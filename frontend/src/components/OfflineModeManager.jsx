import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Smartphone, Download, Upload, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const OfflineModeManager = ({ user, onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState(null);
  const [pendingActions, setPendingActions] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored! Syncing data...');
      syncPendingActions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost. Switching to offline mode.');
      downloadOfflineData();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    loadCachedData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadCachedData = () => {
    try {
      const cached = localStorage.getItem('foodbridge_offline_data');
      const actions = localStorage.getItem('foodbridge_pending_actions');
      const sync = localStorage.getItem('foodbridge_last_sync');
      
      if (cached) setOfflineData(JSON.parse(cached));
      if (actions) setPendingActions(JSON.parse(actions));
      if (sync) setLastSync(new Date(sync));
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const downloadOfflineData = async () => {
    if (!navigator.geolocation) {
      toast.error('Location access required for offline mode');
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        
        const response = await fetch(`/api/donations/offline-package?longitude=${longitude}&latitude=${latitude}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setOfflineData(data);
          localStorage.setItem('foodbridge_offline_data', JSON.stringify(data));
          toast.success('Offline data downloaded successfully');
        }
      });
    } catch (error) {
      console.error('Error downloading offline data:', error);
      toast.error('Failed to download offline data');
    }
  };

  const addPendingAction = (action, data) => {
    const newAction = {
      id: Date.now(),
      action,
      data,
      timestamp: new Date().toISOString()
    };
    
    const updated = [...pendingActions, newAction];
    setPendingActions(updated);
    localStorage.setItem('foodbridge_pending_actions', JSON.stringify(updated));
    
    toast.info(`Action queued for sync: ${action}`);
  };

  const syncPendingActions = async () => {
    if (pendingActions.length === 0) return;
    
    setSyncing(true);
    
    try {
      const response = await fetch('/api/donations/sync-offline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ pending_actions: pendingActions })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        setPendingActions([]);
        localStorage.removeItem('foodbridge_pending_actions');
        
        const syncTime = new Date();
        setLastSync(syncTime);
        localStorage.setItem('foodbridge_last_sync', syncTime.toISOString());
        
        toast.success(`Synced ${result.results.length} actions successfully`);
        
        if (onSyncComplete) {
          onSyncComplete(result);
        }
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync pending actions');
    } finally {
      setSyncing(false);
    }
  };

  const enableSMSMode = () => {
    const smsInstructions = `SMS Commands for FoodBridge:

DONATE [food] [quantity] [address] [time]
Example: DONATE Rice 50 Main St 6PM

CLAIM [donation_id]
Example: CLAIM ABC123

HELP - Get command instructions

Send to: ${process.env.REACT_APP_SMS_NUMBER || '+1234567890'}`;
    
    navigator.clipboard.writeText(smsInstructions).then(() => {
      toast.success('SMS instructions copied to clipboard!');
    }).catch(() => {
      alert(smsInstructions);
    });
  };

  const getOfflineDonations = () => {
    return offlineData?.donations || [];
  };

  const claimDonationOffline = (donationId) => {
    addPendingAction('claim_donation', { donationId });
    
    if (offlineData) {
      const updated = { ...offlineData };
      updated.donations = updated.donations.map(d => 
        d._id === donationId ? { ...d, status: 'reserved', claimed_by: user._id } : d
      );
      setOfflineData(updated);
      localStorage.setItem('foodbridge_offline_data', JSON.stringify(updated));
    }
  };

  const markCollectedOffline = (donationId, rating, review) => {
    addPendingAction('mark_collected', { donationId, rating, review });
    
    if (offlineData) {
      const updated = { ...offlineData };
      updated.donations = updated.donations.map(d => 
        d._id === donationId ? { ...d, status: 'collected' } : d
      );
      setOfflineData(updated);
      localStorage.setItem('foodbridge_offline_data', JSON.stringify(updated));
    }
  };

  const OfflineStatusBar = () => (
    <div className={`fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm font-medium ${
      isOnline ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`}>
      <div className="flex items-center justify-center space-x-2">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4" />
            <span>Online</span>
            {pendingActions.length > 0 && (
              <>
                <span>•</span>
                <button 
                  onClick={syncPendingActions}
                  disabled={syncing}
                  className="underline hover:no-underline"
                >
                  {syncing ? 'Syncing...' : `Sync ${pendingActions.length} actions`}
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline Mode</span>
            {pendingActions.length > 0 && (
              <>
                <span>•</span>
                <span>{pendingActions.length} actions pending</span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
  
  const OfflinePanel = () => (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Offline Mode</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${
          isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <div className="font-medium text-gray-800">Last Sync</div>
            <div className="text-sm text-gray-600">
              {lastSync ? lastSync.toLocaleString() : 'Never'}
            </div>
          </div>
          <button
            onClick={downloadOfflineData}
            disabled={!isOnline}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Download</span>
          </button>
        </div>
        
        {pendingActions.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">
                {pendingActions.length} Pending Actions
              </span>
            </div>
            <div className="space-y-1">
              {pendingActions.slice(-3).map((action, index) => (
                <div key={index} className="text-sm text-yellow-700">
                  {action.action} - {new Date(action.timestamp).toLocaleTimeString()}
                </div>
              ))}
            </div>
            {isOnline && (
              <button
                onClick={syncPendingActions}
                disabled={syncing}
                className="mt-2 flex items-center space-x-2 px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            )}
          </div>
        )}
        
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Smartphone className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">SMS Backup Mode</span>
          </div>
          <p className="text-sm text-blue-700 mb-2">
            Use SMS commands when internet is unavailable
          </p>
          <button
            onClick={enableSMSMode}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Get SMS Instructions
          </button>
        </div>
        
        {offlineData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="font-medium text-green-800 mb-1">Offline Data Available</div>
            <div className="text-sm text-green-700">
              {offlineData.donations?.length || 0} donations cached
            </div>
            <div className="text-xs text-green-600">
              Downloaded: {new Date(offlineData.sync_timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return {
    isOnline,
    offlineData,
    pendingActions,
    syncing,
    lastSync,
    addPendingAction,
    syncPendingActions,
    enableSMSMode,
    getOfflineDonations,
    claimDonationOffline,
    markCollectedOffline,
    downloadOfflineData,
    OfflineStatusBar,
    OfflinePanel
  };
};

export default OfflineModeManager;