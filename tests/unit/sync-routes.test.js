process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() }
}));

jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const app = require('../../backend/server');
const db = require('../../backend/db/config');
const { signToken } = require('../../backend/api/middleware/auth');

const ENTITY_UUID = '550e8400-e29b-41d4-a716-446655440020';

function makeToken(role = 'doctor') {
  return `Bearer ${signToken({ id: 'user-1', role })}`;
}

afterEach(() => {
  jest.resetAllMocks();
});

describe('POST /api/sync/push', () => {
  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/sync/push').send({});
    expect(res.status).toBe(401);
  });

  test('returns 422 when records array is missing', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({});
    expect(res.status).toBe(422);
  });

  test('returns 422 when records is empty array', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({ records: [] });
    expect(res.status).toBe(422);
  });

  test('returns 422 when record is missing required fields', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({ records: [{ entity_type: 'patient' }] });
    expect(res.status).toBe(422);
  });

  test('syncs a CREATE record and returns synced count', async () => {
    // First query: SELECT current record (not found → create)
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })  // SELECT patient for CREATE
      .mockResolvedValue({ rows: [], rowCount: 1 });      // INSERT

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'CREATE',
          data: { given_name: 'Sipho', family_name: 'Dlamini', birth_date: '1990-01-01', gender: 'male' },
          device_id: 'device-abc'
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(1);
    expect(res.body.conflicts).toHaveLength(0);
  });

  test('records conflict when CREATE entity already exists on server', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENTITY_UUID, version: 1, updated_at: new Date().toISOString() }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'CREATE',
          data: { given_name: 'Sipho', family_name: 'Dlamini', birth_date: '1990-01-01', gender: 'male' },
          device_id: 'device-abc'
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toMatch(/already exists/i);
  });

  test('records conflict on version mismatch for UPDATE', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENTITY_UUID, version: 5, updated_at: new Date().toISOString() }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'UPDATE',
          data: { given_name: 'Updated' },
          device_id: 'device-abc',
          client_version: 2  // behind server version 5
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.conflicts).toHaveLength(1);
    expect(res.body.conflicts[0].reason).toMatch(/version conflict/i);
  });

  test('queues error for unsupported entity_type', async () => {
    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'encounter',
          entity_id: ENTITY_UUID,
          operation: 'CREATE',
          data: {},
          device_id: 'device-abc'
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].reason).toMatch(/unsupported entity_type/i);
  });

  test('successfully syncs an UPDATE record', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: ENTITY_UUID, version: 2, updated_at: new Date().toISOString() }],
        rowCount: 1
      })  // SELECT patient
      .mockResolvedValue({ rows: [], rowCount: 1 }); // UPDATE patient + audit

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'UPDATE',
          data: { given_name: 'UpdatedName', family_name: 'Dlamini' },
          device_id: 'device-abc',
          client_version: 2
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(1);
  });

  test('successfully syncs a DELETE record', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: ENTITY_UUID, version: 1, updated_at: new Date().toISOString() }],
        rowCount: 1
      })  // SELECT patient
      .mockResolvedValue({ rows: [], rowCount: 1 }); // soft-delete UPDATE + audit

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'DELETE',
          data: {},
          device_id: 'device-abc',
          client_version: 1
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(1);
  });

  test('records error when UPDATE/DELETE target not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 }); // patient not found

    const res = await request(app)
      .post('/api/sync/push')
      .set('Authorization', makeToken())
      .send({
        records: [{
          entity_type: 'patient',
          entity_id: ENTITY_UUID,
          operation: 'UPDATE',
          data: { given_name: 'Ghost' },
          device_id: 'device-abc'
        }]
      });

    expect(res.status).toBe(200);
    expect(res.body.errors).toHaveLength(1);
    expect(res.body.errors[0].reason).toMatch(/not found/i);
  });
});

describe('GET /api/sync/pull', () => {
  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/sync/pull');
    expect(res.status).toBe(401);
  });

  test('returns 422 for invalid since param', async () => {
    const res = await request(app)
      .get('/api/sync/pull?since=not-a-date')
      .set('Authorization', makeToken());
    expect(res.status).toBe(422);
  });

  test('returns records updated since epoch when no since param', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENTITY_UUID, given_name: 'Sipho', updated_at: new Date().toISOString() }],
      rowCount: 1
    });

    const res = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', makeToken());

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  test('returns records updated since specified timestamp', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const since = new Date(Date.now() - 3600000).toISOString();
    const res = await request(app)
      .get(`/api/sync/pull?since=${encodeURIComponent(since)}&device_id=device-abc`)
      .set('Authorization', makeToken());

    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(0);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('device_id'),
      expect.arrayContaining([since, 'device-abc'])
    );
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .get('/api/sync/pull')
      .set('Authorization', makeToken());

    expect(res.status).toBe(500);
  });
});
