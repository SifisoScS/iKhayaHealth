/**
 * Integration: authentication + authorization flows.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
  compare: jest.fn(),
}));

const request = require('supertest');
const app = require('../../backend/server');
const db = require('../../backend/db/config');
const bcrypt = require('bcrypt');
const { signToken } = require('../../backend/api/middleware/auth');
const crypto = require('crypto');

const USER_UUID  = '550e8400-e29b-41d4-a716-446655440090';
const ADMIN_UUID = '550e8400-e29b-41d4-a716-446655440091';

const adminToken  = () => `Bearer ${signToken({ id: ADMIN_UUID, role: 'admin' })}`;
const doctorToken = () => `Bearer ${signToken({ id: USER_UUID, role: 'doctor' })}`;
const nurseToken  = () => `Bearer ${signToken({ id: USER_UUID, role: 'nurse' })}`;

afterEach(() => jest.resetAllMocks());

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('valid credentials → 200 with token and refreshToken', async () => {
    bcrypt.compare.mockResolvedValue(true);
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: USER_UUID, username: 'dr_smith', password_hash: '$2b$12$hash', role: 'doctor', clinic_id: null, failed_login_attempts: 0, locked_until: null }],
        rowCount: 1,
      })
      .mockResolvedValue({ rows: [], rowCount: 0 }); // reset attempts + insert refresh token

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dr_smith', password: 'SecurePass1234!' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.role).toBe('doctor');
  });

  test('wrong password → 401', async () => {
    bcrypt.compare.mockResolvedValue(false);
    db.query.mockResolvedValue({
      rows: [{ id: USER_UUID, username: 'dr_smith', password_hash: '$2b$12$hash', role: 'doctor', failed_login_attempts: 0, locked_until: null }],
      rowCount: 1,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dr_smith', password: 'WrongPassword' });
    expect(res.status).toBe(401);
  });

  test('user not found → 401', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'anything' });
    expect(res.status).toBe(401);
  });

  test('missing username → 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'SecurePass1234!' });
    expect(res.status).toBe(422);
  });

  test('missing password → 422', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dr_smith' });
    expect(res.status).toBe(422);
  });

  test('account locked → 423', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: USER_UUID, username: 'dr_smith', password_hash: '$2b$12$hash', role: 'doctor', failed_login_attempts: 5, locked_until: new Date(Date.now() + 600000).toISOString() }],
      rowCount: 1,
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'dr_smith', password: 'anything' });
    expect(res.status).toBe(423);
  });
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  test('valid refresh token → 200 with new token', async () => {
    const raw = 'validrefreshtoken123';
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    db.query
      .mockResolvedValueOnce({
        rows: [{ id: 'tok-1', user_id: USER_UUID, token_hash: hash, expires_at: new Date(Date.now() + 86400000), revoked: false, username: 'dr_smith', role: 'doctor' }],
        rowCount: 1,
      })
      .mockResolvedValue({ rows: [], rowCount: 0 }); // revoke + insert
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: raw });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  test('invalid / unknown refresh token → 401', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'badtoken' });
    expect(res.status).toBe(401);
  });

  test('missing refreshToken → 422', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('with valid token and refreshToken → 200', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', doctorToken())
      .send({ refreshToken: 'sometoken' });
    expect(res.status).toBe(200);
  });

  test('without auth token → 401', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken: 'sometoken' });
    expect(res.status).toBe(401);
  });
});

// ── Role-based access: /api/users ─────────────────────────────────────────────
describe('GET /api/users — RBAC', () => {
  test('admin can list users → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ id: USER_UUID, username: 'dr_smith', role: 'doctor' }], rowCount: 1 });
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', adminToken());
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  test('doctor cannot list users → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(403);
  });

  test('nurse cannot list users → 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', nurseToken());
    expect(res.status).toBe(403);
  });
});
