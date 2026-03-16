const SyncManager = require('../../sync/adapters/sync-manager');

// Minimal fetch mock
global.fetch = jest.fn();

describe('SyncManager', () => {
  let manager;
  const getToken = () => 'test-token';

  beforeEach(() => {
    manager = new SyncManager('http://localhost:3001/api', getToken);
    jest.clearAllMocks();
  });

  test('addToQueue adds record with timestamp and synced:false', async () => {
    await manager.addToQueue({ resource: 'patient', method: 'POST', path: '/patients', data: { name: 'Test' } });
    expect(manager.syncQueue).toHaveLength(1);
    expect(manager.syncQueue[0].synced).toBe(false);
    expect(manager.syncQueue[0].timestamp).toBeDefined();
  });

  test('sync sends queued record and clears queue on success', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

    await manager.addToQueue({ resource: 'patient', method: 'POST', path: '/patients', data: { name: 'Test' } });
    await manager.sync();

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(manager.syncQueue).toHaveLength(0);
  });

  test('sync does not run if already syncing', async () => {
    manager.isSyncing = true;
    await manager.addToQueue({ resource: 'patient', method: 'POST', path: '/patients', data: {} });
    await manager.sync();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('resolveConflict returns newer record by timestamp', async () => {
    const local = { updatedAt: '2025-01-02T00:00:00Z', data: 'local' };
    const remote = { updatedAt: '2025-01-01T00:00:00Z', data: 'remote' };
    const result = await manager.resolveConflict(local, remote, 'timestamp');
    expect(result.data).toBe('local');
  });
});
