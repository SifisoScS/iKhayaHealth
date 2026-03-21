import React, { useState, useEffect } from 'react';

export default function SyncStatus() {
  const [status, setStatus] = useState('idle'); // idle | syncing | ok | error
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    if (!window.electronAPI?.onSyncStatus) return;

    const unsubscribe = window.electronAPI.onSyncStatus((event) => {
      setStatus(event.status);
      if (event.status === 'ok') {
        setLastSynced(new Date());
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const icons = { idle: '●', syncing: '↺', ok: '✓', error: '✕' };
  const labels = {
    idle: 'Not synced',
    syncing: 'Syncing…',
    ok: lastSynced ? `Synced ${lastSynced.toLocaleTimeString()}` : 'Synced',
    error: 'Sync failed',
  };

  return (
    <span className={`sync-status sync-${status}`} title={labels[status]}>
      {icons[status]}
    </span>
  );
}
