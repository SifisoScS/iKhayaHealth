/**
 * Tests for patients.js encryption paths.
 * These require ENCRYPTION_KEY to be set before the module loads,
 * so they use jest.isolateModules to get a fresh module instance.
 */
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';
// 32-byte key encoded as 64 hex chars
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

jest.mock('../../backend/db/config', () => ({
  query: jest.fn(),
  pool: { end: jest.fn() }
}));

jest.mock('../../security/audit/logger', () => ({
  logAction: jest.fn(),
  logActionToDb: jest.fn().mockResolvedValue(undefined)
}));

const PATIENT_UUID = '550e8400-e29b-41d4-a716-446655440031';

afterEach(() => {
  jest.resetAllMocks();
});

describe('patients.js encryption paths (ENCRYPTION_KEY set)', () => {
  let request, app, db, signToken;

  beforeAll(() => {
    jest.resetModules();
    request = require('supertest');
    app = require('../../backend/server');
    db = require('../../backend/db/config');
    ({ signToken } = require('../../backend/api/middleware/auth'));
  });

  function doctorToken() {
    return `Bearer ${signToken({ id: 'doc-1', role: 'doctor' })}`;
  }
  function adminToken() {
    return `Bearer ${signToken({ id: 'admin-1', role: 'admin' })}`;
  }

  test('POST /api/patients encrypts PII fields before DB insert', async () => {
    const created = { id: PATIENT_UUID, birth_date: '1990-01-15', gender: 'male', active: true, created_at: new Date().toISOString() };
    db.query.mockResolvedValue({ rows: [created], rowCount: 1 });

    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', doctorToken())
      .send({ given_name: 'Sipho', family_name: 'Dlamini', birth_date: '1990-01-15', gender: 'male' });

    expect(res.status).toBe(201);
    // Response returns plaintext names (not ciphertext)
    expect(res.body.given_name).toBe('Sipho');
    // DB was called with encrypted values (not plaintext 'Sipho')
    const callArgs = db.query.mock.calls[0][1];
    expect(callArgs[0]).not.toBe('Sipho'); // encrypted ciphertext
    expect(callArgs[1]).toBeTruthy();       // IV present
    expect(callArgs[2]).toBeTruthy();       // auth tag present
  });

  test('GET /api/patients/:id decrypts PII fields from DB', async () => {
    // Use the encryption service to produce a real ciphertext we can put in the mock
    const { default: EncryptionService } = await import('../../security/encryption/aes.js').catch(() => {
      return { default: require('../../security/encryption/aes') };
    });
    const key = Buffer.from('a'.repeat(64), 'hex');
    const enc = new EncryptionService(key);
    const givenEnc = enc.encrypt('Sipho');
    const familyEnc = enc.encrypt('Dlamini');

    db.query.mockResolvedValue({
      rows: [{
        id: PATIENT_UUID,
        given_name: givenEnc.encrypted,
        given_name_iv: givenEnc.iv,
        given_name_auth_tag: givenEnc.authTag,
        family_name: familyEnc.encrypted,
        family_name_iv: familyEnc.iv,
        family_name_auth_tag: familyEnc.authTag,
        birth_date: '1990-01-15', gender: 'male', active: true, encounter_ids: []
      }],
      rowCount: 1
    });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
    expect(res.body.given_name).toBe('Sipho');
    expect(res.body.family_name).toBe('Dlamini');
    expect(res.body.given_name_iv).toBeUndefined();
  });

  test('GET /api/patients/:id/export decrypts PII fields', async () => {
    const { default: EncryptionService } = await import('../../security/encryption/aes.js').catch(() => {
      return { default: require('../../security/encryption/aes') };
    });
    const key = Buffer.from('a'.repeat(64), 'hex');
    const enc = new EncryptionService(key);
    const givenEnc = enc.encrypt('Thabo');
    const familyEnc = enc.encrypt('Nkosi');

    const patient = {
      id: PATIENT_UUID,
      given_name: givenEnc.encrypted, given_name_iv: givenEnc.iv, given_name_auth_tag: givenEnc.authTag,
      family_name: familyEnc.encrypted, family_name_iv: familyEnc.iv, family_name_auth_tag: familyEnc.authTag,
      birth_date: '1985-06-20', gender: 'male', active: true
    };

    db.query
      .mockResolvedValueOnce({ rows: [patient], rowCount: 1 })
      .mockResolvedValue({ rows: [], rowCount: 0 });

    const res = await request(app)
      .get(`/api/patients/${PATIENT_UUID}/export`)
      .set('Authorization', doctorToken());

    expect(res.status).toBe(200);
    expect(res.body.patient.given_name).toBe('Thabo');
    expect(res.body.patient.family_name).toBe('Nkosi');
    expect(res.body.patient.given_name_iv).toBeUndefined();
  });
});
