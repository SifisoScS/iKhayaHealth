import React, { useEffect, useRef, useState } from 'react';
import { useApiStatus, setApiErrorReporter } from '../context/ApiStatusContext';

export default function SyncStatus() {
  const { errors, reportApiError, clearErrors } = useApiStatus();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Register the module-level reporter so api.js can push errors in
  useEffect(() => {
    setApiErrorReporter(reportApiError);
    return () => setApiErrorReporter(null);
  }, [reportApiError]);

  // Close the panel when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const count = errors.length;
  const hasErrors = count > 0;

  return (
    <div className="sync-status-wrapper" ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className={`sync-status sync-${hasErrors ? 'error' : 'ok'}`}
        title={hasErrors ? `${count} API error(s) — click to review` : 'No API errors'}
        onClick={() => hasErrors && setOpen((v) => !v)}
        style={{ cursor: hasErrors ? 'pointer' : 'default', background: 'none', border: 'none' }}
      >
        {hasErrors ? `⚠ ${count}` : '✓'}
      </button>

      {open && (
        <div
          className="card"
          style={{
            position: 'absolute',
            right: 0,
            top: '2rem',
            minWidth: '320px',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>API Errors ({count})</strong>
            <button className="btn btn-sm btn-ghost" onClick={clearErrors}>Clear all</button>
          </div>
          {errors.map((e) => (
            <div
              key={e.id}
              style={{
                fontSize: 12,
                padding: '4px 0',
                borderBottom: '1px solid #eee',
                color: e.status >= 500 ? '#c0392b' : '#e67e22',
              }}
            >
              <span style={{ fontWeight: 600 }}>HTTP {e.status}</span>
              {' — '}
              <span style={{ fontFamily: 'monospace' }}>{e.url}</span>
              <br />
              <span style={{ color: '#999' }}>{e.ts.toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
