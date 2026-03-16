const jwt = require('jsonwebtoken');
const authMiddleware = require('../../backend/api/middleware/auth');
const { signToken } = require('../../backend/api/middleware/auth');

process.env.JWT_SECRET = 'test-secret-for-unit-tests';
process.env.DATABASE_URL = 'postgresql://localhost:5432/ikhaya_test';

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  test('returns 401 when no token is provided', () => {
    const req = { header: () => undefined };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next and sets req.user on valid token', () => {
    const payload = { id: 'user-1', role: 'doctor' };
    const token = signToken(payload);
    const req = { header: () => `Bearer ${token}` };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('user-1');
    expect(req.user.role).toBe('doctor');
  });

  test('returns 401 with expired token message on expired token', () => {
    const token = jwt.sign({ id: 'u1', role: 'nurse' }, process.env.JWT_SECRET, { expiresIn: '0s' });
    const req = { header: () => `Bearer ${token}` };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('expired') }));
  });

  test('returns 401 on invalid token', () => {
    const req = { header: () => 'Bearer not.a.real.token' };
    const res = mockRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('signToken', () => {
  test('returns a token that can be verified', () => {
    const payload = { id: 'u2', role: 'admin' };
    const token = signToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe('u2');
    expect(decoded.role).toBe('admin');
  });
});
