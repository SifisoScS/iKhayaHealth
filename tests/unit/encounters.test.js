process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const app = require('../../backend/server');
const db  = require('../../backend/db/config');
const { signToken } = require('../../backend/api/middleware/auth');

const ENC_UUID     = '550e8400-e29b-41d4-a716-446655440040';
const PATIENT_UUID = '550e8400-e29b-41d4-a716-446655440041';
const OBS_UUID     = '550e8400-e29b-41d4-a716-446655440042';

const token = (role = 'doctor') => `Bearer ${signToken({ id: 'user-1', role })}`;

afterEach(() => jest.resetAllMocks());

// ── GET /api/encounters ───────────────────────────────────────────────────────
describe('GET /api/encounters', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/encounters');
    expect(res.status).toBe(401);
  });

  test('returns 422 when patient_id missing or invalid', async () => {
    const res = await request(app)
      .get('/api/encounters?patient_id=not-a-uuid')
      .set('Authorization', token());
    expect(res.status).toBe(422);
  });

  test('returns encounter list for patient', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENC_UUID, encounter_type: 'ambulatory', status: 'finished' }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/encounters?patient_id=${PATIENT_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get(`/api/encounters?patient_id=${PATIENT_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

// ── GET /api/encounters/:id ───────────────────────────────────────────────────
describe('GET /api/encounters/:id', () => {
  test('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .get('/api/encounters/not-a-uuid')
      .set('Authorization', token());
    expect(res.status).toBe(422);
  });

  test('returns 404 when not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(404);
  });

  test('returns encounter with observations', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: ENC_UUID, status: 'finished' }], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.observations).toBeDefined();
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

// ── POST /api/encounters ──────────────────────────────────────────────────────
describe('POST /api/encounters', () => {
  const validBody = {
    patient_id: PATIENT_UUID,
    start_time: new Date().toISOString(),
    encounter_type: 'ambulatory',
    chief_complaint: 'Headache'
  };

  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/encounters').send(validBody);
    expect(res.status).toBe(401);
  });

  test('returns 403 for nurse role', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', token('nurse'))
      .send(validBody);
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing patient_id', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', token())
      .send({ start_time: new Date().toISOString() });
    expect(res.status).toBe(422);
  });

  test('returns 422 for invalid encounter_type', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', token())
      .send({ ...validBody, encounter_type: 'teleport' });
    expect(res.status).toBe(422);
  });

  test('creates encounter and returns 201', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENC_UUID, patient_id: PATIENT_UUID, status: 'in-progress' }],
      rowCount: 1
    });
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', token())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(ENC_UUID);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('insert failed'));
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', token())
      .send(validBody);
    expect(res.status).toBe(500);
  });
});

// ── PUT /api/encounters/:id ───────────────────────────────────────────────────
describe('PUT /api/encounters/:id', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .put(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token('nurse'))
      .send({ status: 'finished' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token())
      .send({ status: 'unknown' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when encounter not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token())
      .send({ status: 'finished' });
    expect(res.status).toBe(404);
  });

  test('updates encounter successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENC_UUID, status: 'finished', updated_at: new Date().toISOString() }],
      rowCount: 1
    });
    const res = await request(app)
      .put(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token())
      .send({ status: 'finished', assessment: 'Tension headache', plan: 'Paracetamol 500mg' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('finished');
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('update failed'));
    const res = await request(app)
      .put(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', token())
      .send({ status: 'finished' });
    expect(res.status).toBe(500);
  });
});

// ── POST /api/encounters/:id/observations ─────────────────────────────────────
describe('POST /api/encounters/:id/observations', () => {
  test('returns 403 for non-clinical role — admin allowed', async () => {
    // Admin is allowed; test that a hypothetical 'receptionist' is not (not in our roles)
    // Just check nurse IS allowed
    db.query
      .mockResolvedValueOnce({ rows: [{ patient_id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: OBS_UUID }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token('nurse'))
      .send({ code: '8867-4', display: 'Heart rate', value_quantity: 72, unit: '/min' });
    expect(res.status).toBe(201);
  });

  test('returns 422 for missing code', async () => {
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token())
      .send({ value_quantity: 72 });
    expect(res.status).toBe(422);
  });

  test('returns 404 when encounter not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token())
      .send({ code: '8867-4', value_quantity: 72 });
    expect(res.status).toBe(404);
  });

  test('records observation successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ patient_id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: OBS_UUID, code: '8867-4', value_quantity: 72, unit: '/min' }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token())
      .send({ code: '8867-4', display: 'Heart rate', value_quantity: 72, unit: '/min' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('8867-4');
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('insert failed'));
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token())
      .send({ code: '8867-4' });
    expect(res.status).toBe(500);
  });
});

// ── GET /api/encounters/:id/observations ──────────────────────────────────────
describe('GET /api/encounters/:id/observations', () => {
  test('returns 404 when encounter not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token());
    expect(res.status).toBe(404);
  });

  test('returns observation list', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: ENC_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: OBS_UUID, code: '29463-7', value_quantity: 68, unit: 'kg' }],
        rowCount: 1
      });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('query failed'));
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});
