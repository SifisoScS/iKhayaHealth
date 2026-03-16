process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../../backend/server');

describe('API Health Check', () => {
  test('GET /health returns status ok (DB may not be available in CI)', async () => {
    const response = await request(app).get('/health');
    expect([200, 503]).toContain(response.status);
    expect(response.body.status).toMatch(/ok|degraded/);
  });
});

describe('Patient routes — auth guard', () => {
  test('GET /api/patients without token returns 401', async () => {
    const response = await request(app).get('/api/patients');
    expect(response.status).toBe(401);
  });

  test('POST /api/patients without token returns 401', async () => {
    const response = await request(app)
      .post('/api/patients')
      .send({ given_name: 'Sipho', family_name: 'Zulu', birth_date: '1990-01-01', gender: 'male' });
    expect(response.status).toBe(401);
  });
});
