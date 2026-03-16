const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, safe API to the renderer process.
// Never expose the full Node.js or Electron API.
contextBridge.exposeInMainWorld('electronAPI', {
  // App version info
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Trigger a sync with the central server
  triggerSync: () => ipcRenderer.invoke('sync:trigger'),

  // Open a native file dialog
  openFile: () => ipcRenderer.invoke('dialog:openFile'),

  // Receive sync status updates from the main process
  onSyncStatus: (callback) => {
    ipcRenderer.on('sync:status', (_event, status) => callback(status));
  }
});
