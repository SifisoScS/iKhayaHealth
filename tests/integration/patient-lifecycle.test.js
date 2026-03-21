/**
 * Integration: full patient lifecycle.
 * All DB calls are mocked — these test the HTTP layer end-to-end through
 * the real Express routes, middleware, and validation.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const app = require('../../backend/server');
const db = require('../../backend/db/config');
const { signToken } = require('../../backend/api/middleware/auth');

const P_UUID = '550e8400-e29b-41d4-a716-446655440070';

const doctorToken  = () => `Bearer ${signToken({ id: 'doc-1', role: 'doctor' })}`;
const adminToken   = () => `Bearer ${signToken({ id: 'adm-1', role: 'admin' })}`;
const nurseToken   = () => `Bearer ${signToken({ id: 'nur-1', role: 'nurse' })}`;

const validPatient = {
  given_name: 'Sipho',
  family_name: 'Zulu',
  birth_date: '1990-06-15',
  gender: 'male',
};

afterEach(() => jest.resetAllMocks());

// ── POST /api/patients ────────────────────────────────────────────────────────
describe('POST /api/patients', () => {
  test('doctor can register a patient → 201', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: P_UUID, given_name: 'Sipho', family_name: 'Zulu', birth_date: '1990-06-15', gender: 'male', active: true }],
      rowCount: 1,
    });
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send(validPatient);
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(P_UUID);
  });

  test('nurse cannot register a patient → 403', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', nurseToken())
      .send(validPatient);
    expect(res.status).toBe(403);
  });

  test('missing given_name → 422', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ family_name: 'Zulu', birth_date: '1990-06-15', gender: 'male' });
    expect(res.status).toBe(422);
  });

  test('invalid gender → 422', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ ...validPatient, gender: 'robot' });
    expect(res.status).toBe(422);
  });

  test('unauthenticated → 401', async () => {
    const res = await request(app).post('/api/patients').send(validPatient);
    expect(res.status).toBe(401);
  });
});

// ── GET /api/patients ─────────────────────────────────────────────────────────
describe('GET /api/patients', () => {
  test('returns paginated patient list → 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: P_UUID, given_name: 'Sipho', family_name: 'Zulu', gender: 'male', active: true }], rowCount: 1 });
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('with search param → 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: P_UUID, given_name: 'Sipho', family_name: 'Zulu', gender: 'male', active: true }], rowCount: 1 });
    const res = await request(app)
      .get('/api/patients?search=Sipho')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(200);
  });

  test('unauthenticated → 401', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('DB error → 500', async () => {
    db.query.mockRejectedValue(new Error('DB down'));
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(500);
  });
});

// ── GET /api/patients/:id ─────────────────────────────────────────────────────
describe('GET /api/patients/:id', () => {
  test('returns patient with no encryption metadata → 200', async () => {
    db.query.mockResolvedValue({
      rows: [{
        id: P_UUID, given_name: 'Sipho', family_name: 'Zulu',
        given_name_iv: 'abc', given_name_auth_tag: 'def',
        family_name_iv: 'ghi', family_name_auth_tag: 'jkl',
        active: true,
      }],
      rowCount: 1,
    });
    const res = await request(app)
      .get(`/api/patients/${P_UUID}`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(200);
    expect(res.body.given_name).toBe('Sipho');
    // IV and auth_tag fields must NOT be exposed to clients
    expect(res.body.given_name_iv).toBeUndefined();
    expect(res.body.given_name_auth_tag).toBeUndefined();
    expect(res.body.family_name_iv).toBeUndefined();
    expect(res.body.family_name_auth_tag).toBeUndefined();
  });

  test('not found → 404', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/patients/${P_UUID}`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(404);
  });

  test('invalid UUID → 422', async () => {
    const res = await request(app)
      .get('/api/patients/not-a-uuid')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(422);
  });
});

// ── PUT /api/patients/:id ─────────────────────────────────────────────────────
describe('PUT /api/patients/:id', () => {
  test('doctor can update patient → 200', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: P_UUID, given_name: 'Sipho', family_name: 'Zulu', active: true }],
      rowCount: 1,
    });
    const res = await request(app)
      .put(`/api/patients/${P_UUID}`)
      .set('Authorization', doctorToken())
      .send({ ...validPatient, phone: '+27821234567' });
    expect(res.status).toBe(200);
  });

  test('nurse cannot update patient → 403', async () => {
    const res = await request(app)
      .put(`/api/patients/${P_UUID}`)
      .set('Authorization', nurseToken())
      .send({ ...validPatient, phone: '+27821234567' });
    expect(res.status).toBe(403);
  });

  test('not found → 404', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/patients/${P_UUID}`)
      .set('Authorization', doctorToken())
      .send({ ...validPatient, phone: '+27821234567' });
    expect(res.status).toBe(404);
  });
});

// ── GET /api/patients/:id/export ──────────────────────────────────────────────
describe('GET /api/patients/:id/export', () => {
  test('returns export with patient + encounters → 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID, given_name: 'Sipho', family_name: 'Zulu', given_name_iv: null, family_name_iv: null }], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/patients/${P_UUID}/export`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(200);
    expect(res.body.patient).toBeDefined();
    expect(res.body.encounters).toBeDefined();
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  test('not found → 404', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/patients/${P_UUID}/export`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(404);
  });
});

// ── DELETE /api/patients/:id ──────────────────────────────────────────────────
describe('DELETE /api/patients/:id', () => {
  test('doctor cannot delete patient (admin only) → 403', async () => {
    const res = await request(app)
      .delete(`/api/patients/${P_UUID}`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(403);
  });

  test('admin can soft-delete patient → 200', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: P_UUID, given_name: 'Sipho' }],
      rowCount: 1,
    });
    const res = await request(app)
      .delete(`/api/patients/${P_UUID}`)
      .set('Authorization', adminToken());
    expect(res.status).toBe(200);
  });

  test('not found → 404', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .delete(`/api/patients/${P_UUID}`)
      .set('Authorization', adminToken());
    expect(res.status).toBe(404);
  });
});
