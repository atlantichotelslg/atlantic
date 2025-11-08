'use client';

import { useState, useEffect } from 'react';
import { ReceiptService } from '@/lib/receipts';
import { isOnline } from '@/lib/supabase';

export default function SyncStatus() {
  const [online, setOnline] = useState(true);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  useEffect(() => {
    // Check online status
    const updateOnlineStatus = () => {
      const status = isOnline();
      const wasOffline = !online;
      setOnline(status);
      
      // Auto-sync when coming online (only if was previously offline)
      if (status && wasOffline && !syncing) {
        console.log('🟢 Back online! Auto-syncing...');
        handleSync();
      }
    };

    // Update unsynced count
    const updateUnsyncedCount = () => {
      const count = ReceiptService.getUnsyncedCount();
      setUnsyncedCount(count);
      console.log(`📊 Checking sync status: ${count} pending receipts`);
    };

    // Initial checks
    updateOnlineStatus();
    updateUnsyncedCount();

    // Listen for online/offline events
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Check unsynced count every 5 seconds
    const interval = setInterval(() => {
      updateUnsyncedCount();
      
      // Try to sync if online and have pending
      if (isOnline() && ReceiptService.getUnsyncedCount() > 0 && !syncing) {
        console.log('🔄 Auto-checking for pending receipts...');
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(interval);
    };
  }, [online, syncing]);

  const handleSync = async () => {
    if (!online || syncing) {
      console.log('❌ Cannot sync: ', !online ? 'offline' : 'already syncing');
      return;
    }
    
    setSyncing(true);
    setSyncResult(null);
    console.log('🚀 Starting sync...');
    
    try {
      const result = await ReceiptService.syncAllPending();
      console.log(`✅ Sync complete: ${result.success} succeeded, ${result.failed} failed`);
      
      setSyncResult(result);
      setLastSyncTime(new Date().toLocaleTimeString());
      setUnsyncedCount(ReceiptService.getUnsyncedCount());
      
      // Clear result after 3 seconds
      setTimeout(() => setSyncResult(null), 3000);
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* Online/Offline Indicator */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
        online 
          ? 'bg-green-100 text-green-700 ring-2 ring-green-300' 
          : 'bg-red-100 text-red-700 ring-2 ring-red-300'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          online ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
        {online ? 'Online' : 'Offline'}
      </div>

      {/* Unsynced Counter */}
      {unsyncedCount > 0 && (
        <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium ring-2 ring-amber-300 animate-pulse">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-bold">{unsyncedCount}</span> pending
        </div>
      )}

      {/* Sync Result */}
      {syncResult && syncResult.success > 0 && (
        <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium animate-bounce">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Synced {syncResult.success}!
        </div>
      )}

      {/* Manual Sync Button */}
      {online && unsyncedCount > 0 && (
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-full text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          <svg 
            className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      )}

      {/* Last Sync Time */}
      {lastSyncTime && !syncing && unsyncedCount === 0 && (
        <div className="text-xs text-gray-500">
          Last synced: {lastSyncTime}
        </div>
      )}
    </div>
  );
}