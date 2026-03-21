/**
 * Integration: clinical lifecycle — encounters, observations, allergies,
 * medications, diagnoses, immunizations.
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

const P_UUID   = '550e8400-e29b-41d4-a716-446655440080';
const ENC_UUID = '550e8400-e29b-41d4-a716-446655440081';
const OBS_UUID = '550e8400-e29b-41d4-a716-446655440082';
const ALG_UUID = '550e8400-e29b-41d4-a716-446655440083';
const MED_UUID = '550e8400-e29b-41d4-a716-446655440084';
const DX_UUID  = '550e8400-e29b-41d4-a716-446655440085';
const IMM_UUID = '550e8400-e29b-41d4-a716-446655440086';

const doctor = () => `Bearer ${signToken({ id: 'doc-1', role: 'doctor' })}`;
const nurse  = () => `Bearer ${signToken({ id: 'nur-1', role: 'nurse' })}`;
const admin  = () => `Bearer ${signToken({ id: 'adm-1', role: 'admin' })}`;

afterEach(() => jest.resetAllMocks());

// ── Encounters ────────────────────────────────────────────────────────────────
describe('POST /api/encounters', () => {
  test('doctor creates encounter → 201', async () => {
    db.query.mockResolvedValue({
      rows: [{ id: ENC_UUID, patient_id: P_UUID, status: 'in-progress', encounter_type: 'ambulatory' }],
      rowCount: 1,
    });
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', doctor())
      .send({ patient_id: P_UUID, encounter_type: 'ambulatory', start_time: new Date().toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe(ENC_UUID);
  });

  test('nurse cannot create encounter → 403', async () => {
    const res = await request(app)
      .post('/api/encounters')
      .set('Authorization', nurse())
      .send({ patient_id: P_UUID, encounter_type: 'ambulatory', start_time: new Date().toISOString() });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/encounters/:id', () => {
  test('returns encounter with observations key → 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: ENC_UUID, status: 'in-progress' }], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}`)
      .set('Authorization', doctor());
    expect(res.status).toBe(200);
    expect(res.body.observations).toBeDefined();
  });
});

describe('POST /api/encounters/:id/observations', () => {
  test('nurse can record observation → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ patient_id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: OBS_UUID, code: '8867-4', value_quantity: 72, unit: '/min' }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', nurse())
      .send({ code: '8867-4', display: 'Heart rate', value_quantity: 72, unit: '/min' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe('8867-4');
  });

  test('doctor can record observation → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ patient_id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: OBS_UUID, code: '29463-7', value_quantity: 68, unit: 'kg' }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', doctor())
      .send({ code: '29463-7', display: 'Body weight', value_quantity: 68, unit: 'kg' });
    expect(res.status).toBe(201);
  });
});

describe('GET /api/encounters/:id/observations', () => {
  test('returns data array → 200', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: ENC_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: OBS_UUID, code: '8867-4' }], rowCount: 1 });
    const res = await request(app)
      .get(`/api/encounters/${ENC_UUID}/observations`)
      .set('Authorization', nurse());
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

// ── Allergies ─────────────────────────────────────────────────────────────────
describe('POST /api/patients/:id/allergies', () => {
  test('doctor creates allergy → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: ALG_UUID, allergen: 'Penicillin', status: 'active' }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/patients/${P_UUID}/allergies`)
      .set('Authorization', doctor())
      .send({ allergen: 'Penicillin', severity: 'severe' });
    expect(res.status).toBe(201);
    expect(res.body.allergen).toBe('Penicillin');
  });
});

describe('PUT /api/patients/:id/allergies/:aid', () => {
  test('updates allergy → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ id: ALG_UUID, allergen: 'Penicillin', status: 'resolved' }], rowCount: 1 });
    const res = await request(app)
      .put(`/api/patients/${P_UUID}/allergies/${ALG_UUID}`)
      .set('Authorization', doctor())
      .send({ status: 'resolved' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });
});

describe('DELETE /api/patients/:id/allergies/:aid', () => {
  test('deactivates allergy → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ id: ALG_UUID }], rowCount: 1 });
    const res = await request(app)
      .delete(`/api/patients/${P_UUID}/allergies/${ALG_UUID}`)
      .set('Authorization', doctor());
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deactivated/i);
  });
});

// ── Medications ───────────────────────────────────────────────────────────────
describe('POST /api/patients/:id/medications', () => {
  test('doctor prescribes medication → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: MED_UUID, medication_name: 'Metformin', status: 'active' }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/patients/${P_UUID}/medications`)
      .set('Authorization', doctor())
      .send({ medication_name: 'Metformin', start_date: new Date().toISOString(), dosage: '500mg' });
    expect(res.status).toBe(201);
    expect(res.body.medication_name).toBe('Metformin');
  });
});

describe('PUT /api/patients/:id/medications/:mid', () => {
  test('updates medication status → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ id: MED_UUID, medication_name: 'Metformin', status: 'stopped' }], rowCount: 1 });
    const res = await request(app)
      .put(`/api/patients/${P_UUID}/medications/${MED_UUID}`)
      .set('Authorization', doctor())
      .send({ status: 'stopped' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('stopped');
  });
});

// ── Diagnoses ─────────────────────────────────────────────────────────────────
describe('POST /api/patients/:id/diagnoses', () => {
  test('doctor records diagnosis → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: DX_UUID, condition_name: 'Hypertension', status: 'active' }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/patients/${P_UUID}/diagnoses`)
      .set('Authorization', doctor())
      .send({ condition_name: 'Hypertension', condition_code: 'I10', severity: 'moderate' });
    expect(res.status).toBe(201);
    expect(res.body.condition_name).toBe('Hypertension');
  });
});

describe('PUT /api/patients/:id/diagnoses/:did', () => {
  test('resolves diagnosis → 200', async () => {
    db.query.mockResolvedValue({ rows: [{ id: DX_UUID, condition_name: 'Hypertension', status: 'resolved' }], rowCount: 1 });
    const res = await request(app)
      .put(`/api/patients/${P_UUID}/diagnoses/${DX_UUID}`)
      .set('Authorization', doctor())
      .send({ status: 'resolved', resolved_date: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });
});

// ── Immunizations ─────────────────────────────────────────────────────────────
describe('POST /api/patients/:id/immunizations', () => {
  test('nurse records immunization → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: IMM_UUID, vaccine_name: 'BCG', dose_number: 1 }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/patients/${P_UUID}/immunizations`)
      .set('Authorization', nurse())
      .send({ vaccine_name: 'BCG', administration_date: new Date().toISOString(), dose_number: 1 });
    expect(res.status).toBe(201);
    expect(res.body.vaccine_name).toBe('BCG');
  });

  test('doctor records immunization → 201', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: P_UUID }], rowCount: 1 })
      .mockResolvedValue({ rows: [{ id: IMM_UUID, vaccine_name: 'MMR', dose_number: 1 }], rowCount: 1 });
    const res = await request(app)
      .post(`/api/patients/${P_UUID}/immunizations`)
      .set('Authorization', doctor())
      .send({ vaccine_name: 'MMR', administration_date: new Date().toISOString() });
    expect(res.status).toBe(201);
  });
});
