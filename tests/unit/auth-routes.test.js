process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() }
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn()
}));

jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../../backend/server');
const db = require('../../backend/db/config');
const { signToken } = require('../../backend/api/middleware/auth');

const validUser = {
  id: '550e8400-e29b-41d4-a716-446655440010',
  username: 'testdoc',
  password_hash: '$2b$12$hashedpassword',
  role: 'doctor',
  clinic_id: 'clinic-1',
  failed_login_attempts: 0,
  locked_until: null
};

afterEach(() => {
  jest.resetAllMocks();
});

describe('POST /api/auth/login', () => {
  test('returns 422 when username is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'secret' });
    expect(res.status).toBe(422);
  });

  test('returns 422 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'doc' });
    expect(res.status).toBe(422);
  });

  test('returns 401 when user not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'unknown', password: 'secret' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test('returns 401 on wrong password', async () => {
    db.query.mockResolvedValueOnce({ rows: [validUser], rowCount: 1 });
    bcrypt.compare.mockResolvedValue(false);
    db.query.mockResolvedValue({ rows: [], rowCount: 0 }); // UPDATE failed_login_attempts

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testdoc', password: 'wrongpass' });

    expect(res.status).toBe(401);
  });

  test('returns 429 when account is locked', async () => {
    const lockedUser = {
      ...validUser,
      locked_until: new Date(Date.now() + 60 * 60 * 1000).toISOString() // locked 1h from now
    };
    db.query.mockResolvedValue({ rows: [lockedUser], rowCount: 1 });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testdoc', password: 'anypass' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/locked/i);
  });

  test('returns 200 with tokens on successful login', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [validUser], rowCount: 1 }) // SELECT user
      .mockResolvedValue({ rows: [], rowCount: 1 });              // UPDATE + INSERT
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testdoc', password: 'correctpass' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.role).toBe('doctor');
  });

  test('returns 500 when DB throws during login', async () => {
    db.query.mockRejectedValue(new Error('DB unavailable'));
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testdoc', password: 'correctpass' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/login failed/i);
  });
});

describe('POST /api/auth/refresh', () => {
  test('returns 422 when refreshToken is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
  });

  test('returns 401 on unknown refresh token', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'unknowntoken123' });

    expect(res.status).toBe(401);
  });

  test('returns 401 on revoked token', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: 'rt-1', user_id: 'u-1', expires_at: new Date(Date.now() + 1000).toISOString(), revoked: true, role: 'doctor', clinic_id: null }],
      rowCount: 1
    });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'revokedtoken' });

    expect(res.status).toBe(401);
  });

  test('returns 200 with new tokens on valid refresh', async () => {
    const tokenRecord = {
      id: 'rt-1',
      user_id: validUser.id,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked: false,
      role: 'doctor',
      clinic_id: 'clinic-1'
    };
    db.query
      .mockResolvedValueOnce({ rows: [tokenRecord], rowCount: 1 }) // SELECT
      .mockResolvedValue({ rows: [], rowCount: 1 });               // UPDATE + INSERT

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'validrawtoken' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  test('returns 500 when DB throws during refresh', async () => {
    db.query.mockRejectedValue(new Error('DB unavailable'));

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'sometoken' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/refresh failed/i);
  });
});

describe('POST /api/auth/logout', () => {
  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/auth/logout').send({});
    expect(res.status).toBe(401);
  });

  test('returns 200 and revokes token when authenticated', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const token = `Bearer ${signToken({ id: validUser.id, role: 'doctor' })}`;

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', token)
      .send({ refreshToken: 'sometoken' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/logged out/i);
  });
});
