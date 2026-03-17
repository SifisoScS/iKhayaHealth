process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

// Mock DB and audit logger before any requires
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

// Valid RFC 4122 UUIDs (version 4, variant 1)
const PATIENT_UUID = '550e8400-e29b-41d4-a716-446655440001';
const PATIENT_UUID_2 = '550e8400-e29b-41d4-a716-446655440002';

function makeToken(role, id = 'user-1') {
  return `Bearer ${signToken({ id, role })}`;
}

const doctorToken = () => makeToken('doctor', 'doc-1');
const nurseToken = () => makeToken('nurse', 'nurse-1');
const adminToken = () => makeToken('admin', 'admin-1');

afterEach(() => {
  jest.resetAllMocks();
});

describe('GET /api/patients', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
  });

  test('returns patient list for authenticated user', async () => {
    db.query.mockResolvedValue({ rows: [{ id: PATIENT_UUID, given_name: 'Sipho' }], rowCount: 1 });

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('supports search query param', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get('/api/patients?search=Sipho')
      .set('Authorization', nurseToken());

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('plainto_tsquery'),
      expect.any(Array)
    );
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB connection refused'));

    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', doctorToken());

    expect(res.status).toBe(500);
  });
});

describe('GET /api/patients/:id', () => {
  test('returns 422 for non-UUID id', async () => {
    const res = await request(app)
      .get('/api/patients/not-a-uuid')
      .set('Authorization', doctorToken());
    expect(res.status).toBe(422);
  });

  test('returns 404 when patient not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(404);
  });

  test('returns patient when found', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: PATIENT_UUID, given_name: 'enc', given_name_iv: null, given_name_auth_tag: null, family_name: 'enc2', family_name_iv: null, family_name_auth_tag: null }],
      rowCount: 1
    });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
  });
});

describe('POST /api/patients', () => {
  const validBody = {
    given_name: 'Sipho',
    family_name: 'Dlamini',
    birth_date: '1990-01-15',
    gender: 'male'
  };

  test('returns 401 without token', async () => {
    const res = await request(app).post('/api/patients').send(validBody);
    expect(res.status).toBe(401);
  });

  test('returns 403 for nurse role', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', nurseToken())
      .send(validBody);
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ given_name: 'Only' });
    expect(res.status).toBe(422);
  });

  test('returns 422 for invalid gender', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ ...validBody, gender: 'unknown-value' });
    expect(res.status).toBe(422);
  });

  test('creates patient and returns 201 for doctor', async () => {
    const created = { id: PATIENT_UUID, birth_date: '1990-01-15', gender: 'male', active: true, created_at: new Date().toISOString() };
    db.query.mockResolvedValue({ rows: [created], rowCount: 1 });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.given_name).toBe('Sipho');
    expect(res.body.id).toBe(PATIENT_UUID);
  });

  test('creates patient for admin role', async () => {
    const created = { id: PATIENT_UUID_2, birth_date: '1990-01-15', gender: 'female', active: true, created_at: new Date().toISOString() };
    db.query.mockResolvedValue({ rows: [created], rowCount: 1 });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', adminToken())
      .send({ ...validBody, gender: 'female' });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/patients/:id', () => {
  const validBody = {
    given_name: 'Sipho',
    family_name: 'Zulu',
    birth_date: '1990-01-15',
    gender: 'male'
  };

  test('returns 403 for nurse role', async () => {
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', nurseToken())
      .send(validBody);
    expect(res.status).toBe(403);
  });

  test('returns 404 when patient not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken())
      .send(validBody);

    expect(res.status).toBe(404);
  });

  test('updates patient successfully', async () => {
    const updated = { id: PATIENT_UUID, birth_date: '1990-01-15', gender: 'male', updated_at: new Date().toISOString() };
    db.query.mockResolvedValue({ rows: [updated], rowCount: 1 });

    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken())
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.given_name).toBe('Sipho');
  });
});

describe('DELETE /api/patients/:id', () => {
  test('returns 403 for non-admin', async () => {
    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());
    expect(res.status).toBe(403);
  });

  test('soft-deletes patient for admin', async () => {
    db.query.mockResolvedValue({ rows: [{ id: PATIENT_UUID }], rowCount: 1 });

    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

describe('GET /api/patients/:id — error and encryption paths', () => {
  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('connection lost'));

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(500);
  });

  test('strips IV/auth_tag fields from response', async () => {
    db.query.mockResolvedValue({
      rows: [{
        id: PATIENT_UUID,
        given_name: 'Sipho', given_name_iv: 'iv1', given_name_auth_tag: 'tag1',
        family_name: 'Dlamini', family_name_iv: 'iv2', family_name_auth_tag: 'tag2',
        birth_date: '1990-01-15', gender: 'male', active: true, encounter_ids: []
      }],
      rowCount: 1
    });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
    expect(res.body.given_name_iv).toBeUndefined();
    expect(res.body.given_name_auth_tag).toBeUndefined();
    expect(res.body.family_name_iv).toBeUndefined();
    expect(res.body.family_name_auth_tag).toBeUndefined();
  });
});

describe('POST /api/patients — error path', () => {
  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('insert failed'));

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ given_name: 'Sipho', family_name: 'Dlamini', birth_date: '1990-01-15', gender: 'male' });

    expect(res.status).toBe(500);
  });
});

describe('PUT /api/patients/:id — error path', () => {
  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('update failed'));

    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken())
      .send({ given_name: 'Sipho', family_name: 'Dlamini', birth_date: '1990-01-15', gender: 'male' });

    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/patients/:id — error path', () => {
  test('returns 404 when patient already inactive', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(404);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('delete failed'));

    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', adminToken());

    expect(res.status).toBe(500);
  });
});

describe('GET /api/patients/:id/export', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get(`/api/patients/${PATIENT_UUID}/export`);
    expect(res.status).toBe(401);
  });

  test('returns 404 when patient not found', async () => {
    // Promise.all fires 6 parallel queries; patient query returns empty
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/export`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(404);
  });

  test('returns full export JSON for existing patient', async () => {
    const patient = {
      id: PATIENT_UUID, given_name: 'enc', given_name_iv: 'iv1', given_name_auth_tag: 'tag1',
      family_name: 'enc2', family_name_iv: 'iv2', family_name_auth_tag: 'tag2',
      birth_date: '1990-01-15', gender: 'male', active: true
    };
    db.query
      .mockResolvedValueOnce({ rows: [patient], rowCount: 1 }) // patient
      .mockResolvedValue({ rows: [], rowCount: 0 });            // encounters, allergies, meds, diagnoses, immunizations

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/export`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
    expect(res.body.patient).toBeDefined();
    expect(res.body.encounters).toBeDefined();
    expect(res.body.exportedAt).toBeDefined();
    // Encryption internals must NOT be in the export
    expect(res.body.patient.given_name_iv).toBeUndefined();
    expect(res.body.patient.given_name_auth_tag).toBeUndefined();
    expect(res.body.patient.family_name_iv).toBeUndefined();
    expect(res.body.patient.family_name_auth_tag).toBeUndefined();
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('export query failed'));

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/export`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(500);
  });
});
