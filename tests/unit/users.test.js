process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

jest.mock('../../backend/db/config', () => ({ query: jest.fn(), pool: { end: jest.fn() } }));
jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined)
}));
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$12$hashed'),
  compare: jest.fn()
}));

const request = require('supertest');
const app = require('../../backend/server');
const db  = require('../../backend/db/config');
const { signToken } = require('../../backend/api/middleware/auth');

const USER_UUID   = '550e8400-e29b-41d4-a716-446655440060';
const ADMIN_UUID  = '550e8400-e29b-41d4-a716-446655440061';

const token = (role = 'admin', id = ADMIN_UUID) => `Bearer ${signToken({ id, role })}`;

afterEach(() => jest.resetAllMocks());

// ── GET /api/users ────────────────────────────────────────────────────────────
describe('GET /api/users', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('returns 403 for non-admin role', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', token('doctor'));
    expect(res.status).toBe(403);
  });

  test('returns user list for admin', async () => {
    db.query.mockResolvedValue({
      rows: [
        { id: USER_UUID, username: 'dr_smith', role: 'doctor', active: true },
        { id: ADMIN_UUID, username: 'admin', role: 'admin', active: true }
      ],
      rowCount: 2
    });
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.count).toBe(2);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

// ── GET /api/users/:id ────────────────────────────────────────────────────────
describe('GET /api/users/:id', () => {
  test('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .get('/api/users/not-a-uuid')
      .set('Authorization', token());
    expect(res.status).toBe(422);
  });

  test('returns 404 when user not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(404);
  });

  test('returns user details', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: USER_UUID, username: 'dr_smith', role: 'doctor', active: true, failed_login_attempts: 0 }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('dr_smith');
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

// ── POST /api/users ───────────────────────────────────────────────────────────
describe('POST /api/users', () => {
  const validBody = {
    username: 'new_nurse',
    password: 'SecurePass1234!',
    role: 'nurse'
  };

  test('returns 403 for non-admin', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token('doctor'))
      .send(validBody);
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing username', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send({ password: 'SecurePass1234!', role: 'nurse' });
    expect(res.status).toBe(422);
  });

  test('returns 422 for password too short', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send({ username: 'nurse1', password: 'short', role: 'nurse' });
    expect(res.status).toBe(422);
  });

  test('returns 422 for invalid role', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send({ username: 'nurse1', password: 'SecurePass1234!', role: 'receptionist' });
    expect(res.status).toBe(422);
  });

  test('returns 409 when username already exists', async () => {
    db.query.mockResolvedValue({ rows: [{ id: USER_UUID }], rowCount: 1 });
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send(validBody);
    expect(res.status).toBe(409);
  });

  test('creates user and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValue({
        rows: [{ id: USER_UUID, username: 'new_nurse', role: 'nurse', active: true, created_at: new Date().toISOString() }],
        rowCount: 1
      });
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.username).toBe('new_nurse');
  });

  test('returns 500 on DB error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockRejectedValue(new Error('insert failed'));
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', token())
      .send(validBody);
    expect(res.status).toBe(500);
  });
});

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
describe('PUT /api/users/:id', () => {
  test('returns 403 for non-admin', async () => {
    const res = await request(app)
      .put(`/api/users/${USER_UUID}`)
      .set('Authorization', token('nurse'))
      .send({ role: 'doctor' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid role', async () => {
    const res = await request(app)
      .put(`/api/users/${USER_UUID}`)
      .set('Authorization', token())
      .send({ role: 'superuser' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when user not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/users/${USER_UUID}`)
      .set('Authorization', token())
      .send({ role: 'doctor' });
    expect(res.status).toBe(404);
  });

  test('updates user successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: USER_UUID, username: 'dr_smith', role: 'doctor', active: true }],
      rowCount: 1
    });
    const res = await request(app)
      .put(`/api/users/${USER_UUID}`)
      .set('Authorization', token())
      .send({ role: 'doctor', active: true });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('doctor');
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('update failed'));
    const res = await request(app)
      .put(`/api/users/${USER_UUID}`)
      .set('Authorization', token())
      .send({ role: 'doctor' });
    expect(res.status).toBe(500);
  });
});

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
describe('DELETE /api/users/:id', () => {
  test('returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete(`/api/users/${USER_UUID}`)
      .set('Authorization', token('doctor'));
    expect(res.status).toBe(403);
  });

  test('returns 400 when trying to deactivate self', async () => {
    const res = await request(app)
      .delete(`/api/users/${ADMIN_UUID}`)
      .set('Authorization', token('admin', ADMIN_UUID));
    expect(res.status).toBe(400);
  });

  test('returns 404 when user not found or already inactive', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .delete(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(404);
  });

  test('deactivates user successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: USER_UUID, username: 'dr_smith' }],
      rowCount: 1
    });
    const res = await request(app)
      .delete(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('delete failed'));
    const res = await request(app)
      .delete(`/api/users/${USER_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});
