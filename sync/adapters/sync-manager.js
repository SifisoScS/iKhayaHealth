const ConflictResolver = require('../conflict/resolver');

const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000];

class SyncManager {
  constructor(apiBaseUrl, getAuthToken) {
    this.apiBaseUrl = apiBaseUrl;
    this.getAuthToken = getAuthToken;
    this.syncQueue = [];
    this.isSyncing = false;
  }

  async addToQueue(record) {
    this.syncQueue.push({
      ...record,
      timestamp: Date.now(),
      synced: false
    });
  }

  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      while (this.syncQueue.length > 0) {
        const record = this.syncQueue[0];
        await this.syncRecord(record);
        this.syncQueue.shift();
      }
    } catch (error) {
      console.error('Sync error:', error.message);
    } finally {
      this.isSyncing = false;
    }
  }

  async syncRecord(record) {
    const { resource, method, path: resourcePath, data } = record;
    const url = `${this.apiBaseUrl}${resourcePath}`;
    const token = await this.getAuthToken();

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const response = await fetch(url, {
          method: method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(data)
        });

        if (response.status === 409) {
          // Conflict — fetch remote and resolve
          const remoteResponse = await fetch(`${this.apiBaseUrl}${resourcePath}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const remote = await remoteResponse.json();
          const resolved = ConflictResolver.resolve(data, remote, 'timestamp');
          // Retry with resolved data
          record.data = resolved;
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        record.synced = true;
        return;
      } catch (err) {
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.warn(`Sync attempt ${attempt + 1} failed for ${resource}, retrying in ${delay}ms: ${err.message}`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          console.error(`Sync failed permanently for ${resource} after ${attempt + 1} attempts: ${err.message}`);
          throw err;
        }
      }
    }
  }

  async resolveConflict(local, remote, strategy = 'timestamp') {
    return ConflictResolver.resolve(local, remote, strategy);
  }
}

module.exports = SyncManager;
