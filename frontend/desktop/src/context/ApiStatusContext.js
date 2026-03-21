import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Tracks API-level errors (4xx/5xx) so any component can surface them.
 * api.js calls reportApiError() when a request fails; SyncStatus reads it.
 */

const ApiStatusContext = createContext(null);

export function ApiStatusProvider({ children }) {
  const [errors, setErrors] = useState([]); // [{ id, status, url, ts }]

  const reportApiError = useCallback((status, url) => {
    setErrors((prev) => [
      { id: Date.now() + Math.random(), status, url, ts: new Date() },
      ...prev.slice(0, 19), // keep at most 20 entries
    ]);
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  return (
    <ApiStatusContext.Provider value={{ errors, reportApiError, clearErrors }}>
      {children}
    </ApiStatusContext.Provider>
  );
}

export function useApiStatus() {
  const ctx = useContext(ApiStatusContext);
  if (!ctx) throw new Error('useApiStatus must be used inside ApiStatusProvider');
  return ctx;
}

// Module-level callback so api.js (non-React) can call into the context
let _reporter = null;
export function setApiErrorReporter(fn) { _reporter = fn; }
export function dispatchApiError(status, url) { _reporter?.(status, url); }
