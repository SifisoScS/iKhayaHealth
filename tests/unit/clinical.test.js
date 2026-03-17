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

const PATIENT_UUID = '550e8400-e29b-41d4-a716-446655440050';
const ALLERGY_UUID = '550e8400-e29b-41d4-a716-446655440051';
const MED_UUID     = '550e8400-e29b-41d4-a716-446655440052';
const DIAG_UUID    = '550e8400-e29b-41d4-a716-446655440053';
const IMMU_UUID    = '550e8400-e29b-41d4-a716-446655440054';

const token = (role = 'doctor') => `Bearer ${signToken({ id: 'user-1', role })}`;

afterEach(() => jest.resetAllMocks());

// ── ALLERGIES ─────────────────────────────────────────────────────────────────
describe('GET /api/patients/:patientId/allergies', () => {
  test('returns 401 without token', async () => {
    const res = await request(app).get(`/api/patients/${PATIENT_UUID}/allergies`);
    expect(res.status).toBe(401);
  });

  test('returns 422 for non-UUID patientId', async () => {
    const res = await request(app)
      .get('/api/patients/not-a-uuid/allergies')
      .set('Authorization', token());
    expect(res.status).toBe(422);
  });

  test('returns allergy list', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ALLERGY_UUID, allergen: 'Penicillin', severity: 'severe', status: 'active' }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/patients/:patientId/allergies', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token('nurse'))
      .send({ allergen: 'Aspirin' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing allergen', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token())
      .send({ severity: 'mild' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when patient not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token())
      .send({ allergen: 'Penicillin' });
    expect(res.status).toBe(404);
  });

  test('creates allergy and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: ALLERGY_UUID, allergen: 'Penicillin', allergy_type: 'allergy', severity: 'severe', status: 'active' }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token())
      .send({ allergen: 'Penicillin', severity: 'severe' });
    expect(res.status).toBe(201);
    expect(res.body.allergen).toBe('Penicillin');
  });

  test('returns 500 on DB error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockRejectedValue(new Error('insert failed'));
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/allergies`)
      .set('Authorization', token())
      .send({ allergen: 'Penicillin' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/patients/:patientId/allergies/:id', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token('nurse'))
      .send({ status: 'resolved' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token())
      .send({ status: 'gone' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when allergy not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token())
      .send({ status: 'resolved' });
    expect(res.status).toBe(404);
  });

  test('updates allergy successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ALLERGY_UUID, allergen: 'Penicillin', status: 'resolved', severity: 'mild' }],
      rowCount: 1
    });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token())
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });
});

describe('DELETE /api/patients/:patientId/allergies/:id', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token('nurse'));
    expect(res.status).toBe(403);
  });

  test('returns 404 when allergy not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(404);
  });

  test('deactivates allergy', async () => {
    db.query.mockResolvedValue({ rows: [{ id: ALLERGY_UUID }], rowCount: 1 });
    const res = await request(app)
      .delete(`/api/patients/${PATIENT_UUID}/allergies/${ALLERGY_UUID}`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

// ── MEDICATIONS ───────────────────────────────────────────────────────────────
describe('GET /api/patients/:patientId/medications', () => {
  test('returns medication list', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: MED_UUID, medication_name: 'Metformin', status: 'active' }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/patients/:patientId/medications', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token('nurse'))
      .send({ medication_name: 'Metformin', start_date: new Date().toISOString() });
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing medication_name', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token())
      .send({ start_date: new Date().toISOString() });
    expect(res.status).toBe(422);
  });

  test('returns 422 for missing start_date', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token())
      .send({ medication_name: 'Metformin' });
    expect(res.status).toBe(422);
  });

  test('creates medication and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: MED_UUID, medication_name: 'Metformin', status: 'active', start_date: new Date().toISOString() }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/medications`)
      .set('Authorization', token())
      .send({ medication_name: 'Metformin', start_date: new Date().toISOString(), dosage: '500mg' });
    expect(res.status).toBe(201);
    expect(res.body.medication_name).toBe('Metformin');
  });
});

describe('PUT /api/patients/:patientId/medications/:id', () => {
  test('returns 422 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/medications/${MED_UUID}`)
      .set('Authorization', token())
      .send({ status: 'cancelled' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when medication not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/medications/${MED_UUID}`)
      .set('Authorization', token())
      .send({ status: 'stopped' });
    expect(res.status).toBe(404);
  });

  test('updates medication successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: MED_UUID, medication_name: 'Metformin', status: 'stopped' }],
      rowCount: 1
    });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/medications/${MED_UUID}`)
      .set('Authorization', token())
      .send({ status: 'stopped' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
  });
});

// ── DIAGNOSES ─────────────────────────────────────────────────────────────────
describe('GET /api/patients/:patientId/diagnoses', () => {
  test('returns diagnosis list', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: DIAG_UUID, condition_name: 'Type 2 Diabetes', status: 'active' }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/diagnoses`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('POST /api/patients/:patientId/diagnoses', () => {
  test('returns 403 for nurse', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/diagnoses`)
      .set('Authorization', token('nurse'))
      .send({ condition_name: 'Hypertension' });
    expect(res.status).toBe(403);
  });

  test('returns 422 for missing condition_name', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/diagnoses`)
      .set('Authorization', token())
      .send({ severity: 'mild' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when patient not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/diagnoses`)
      .set('Authorization', token())
      .send({ condition_name: 'Hypertension' });
    expect(res.status).toBe(404);
  });

  test('creates diagnosis and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: DIAG_UUID, condition_name: 'Hypertension', condition_code: 'I10', status: 'active' }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/diagnoses`)
      .set('Authorization', token())
      .send({ condition_name: 'Hypertension', condition_code: 'I10', severity: 'moderate' });
    expect(res.status).toBe(201);
    expect(res.body.condition_name).toBe('Hypertension');
  });
});

describe('PUT /api/patients/:patientId/diagnoses/:id', () => {
  test('returns 422 for invalid status', async () => {
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/diagnoses/${DIAG_UUID}`)
      .set('Authorization', token())
      .send({ status: 'cured' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when diagnosis not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/diagnoses/${DIAG_UUID}`)
      .set('Authorization', token())
      .send({ status: 'resolved' });
    expect(res.status).toBe(404);
  });

  test('updates diagnosis successfully', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: DIAG_UUID, condition_name: 'Hypertension', status: 'resolved' }],
      rowCount: 1
    });
    const res = await request(app)
      .put(`/api/patients/${PATIENT_UUID}/diagnoses/${DIAG_UUID}`)
      .set('Authorization', token())
      .send({ status: 'resolved', resolved_date: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });
});

// ── IMMUNIZATIONS ─────────────────────────────────────────────────────────────
describe('GET /api/patients/:patientId/immunizations', () => {
  test('returns immunization list', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: IMMU_UUID, vaccine_name: 'BCG', administration_date: '2020-01-15', dose_number: 1 }],
      rowCount: 1
    });
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  test('returns 500 on DB error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/patients/:patientId/immunizations', () => {
  test('returns 401 without token', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString() });
    expect(res.status).toBe(401);
  });

  test('nurse can record immunization', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: IMMU_UUID, vaccine_name: 'BCG', administration_date: new Date().toISOString(), dose_number: 1 }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token('nurse'))
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString() });
    expect(res.status).toBe(201);
  });

  test('returns 422 for missing vaccine_name', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token())
      .send({ administration_date: new Date().toISOString() });
    expect(res.status).toBe(422);
  });

  test('returns 422 for missing administration_date', async () => {
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token())
      .send({ vaccine_name: 'BCG' });
    expect(res.status).toBe(422);
  });

  test('returns 404 when patient not found', async () => {
    db.query.mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token())
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString() });
    expect(res.status).toBe(404);
  });

  test('creates immunization and returns 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockResolvedValue({
        rows: [{ id: IMMU_UUID, vaccine_name: 'BCG', administration_date: new Date().toISOString(), dose_number: 1 }],
        rowCount: 1
      });
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token())
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString(), dose_number: 1, route: 'intramuscular' });
    expect(res.status).toBe(201);
    expect(res.body.vaccine_name).toBe('BCG');
  });

  test('returns 500 on DB error', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: PATIENT_UUID }], rowCount: 1 })
      .mockRejectedValue(new Error('insert failed'));
    const res = await request(app)
      .post(`/api/patients/${PATIENT_UUID}/immunizations`)
      .set('Authorization', token())
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString() });
    expect(res.status).toBe(500);
  });
});
