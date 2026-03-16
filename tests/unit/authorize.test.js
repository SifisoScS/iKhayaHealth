const authorize = require('../../backend/api/middleware/authorize');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authorize middleware', () => {
  test('calls next when user role is in allowed roles', () => {
    const middleware = authorize('doctor', 'admin');
    const req = { user: { role: 'doctor' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('returns 403 when user role is not in allowed roles', () => {
    const middleware = authorize('doctor', 'admin');
    const req = { user: { role: 'nurse' } };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when req.user has no role', () => {
    const middleware = authorize('doctor');
    const req = { user: {} };
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when req.user is missing', () => {
    const middleware = authorize('doctor');
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
