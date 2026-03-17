const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const { signToken } = require('../middleware/auth');
const { logAction } = require('../../../security/audit/logger');

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_EXPIRES_DAYS = parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '30', 10);
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function refreshExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRES_DAYS);
  return d;
}

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').trim().notEmpty().withMessage('username is required'),
    body('password').notEmpty().withMessage('password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const result = await db.query(
        `SELECT id, username, password_hash, role, clinic_id, failed_login_attempts, locked_until
         FROM users WHERE username = $1`,
        [username]
      );

      const user = result.rows[0];

      if (!user) {
        // Constant-time response to prevent username enumeration
        await bcrypt.compare(password, '$2b$12$invalidhashpaddingtoconstanttime');
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Check account lockout
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(429).json({
          error: `Account locked due to too many failed attempts. Try again after ${new Date(user.locked_until).toISOString()}.`
        });
      }

      const match = await bcrypt.compare(password, user.password_hash);

      if (!match) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const lockUntil = attempts >= MAX_FAILED_ATTEMPTS
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
          : null;

        await db.query(
          `UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3`,
          [attempts, lockUntil, user.id]
        );
        return res.status(401).json({ error: 'Invalid credentials.' });
      }

      // Reset failed attempts and update last_login
      await db.query(
        `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = $1`,
        [user.id]
      );

      // Issue access token
      const accessToken = signToken({ id: user.id, role: user.role, clinicId: user.clinic_id });

      // Issue refresh token
      const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
      const tokenHash = hashToken(rawRefresh);
      const expiresAt = refreshExpiresAt();

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, tokenHash, expiresAt]
      );

      logAction(user.id, 'LOGIN', 'user', { username: user.username, ip: req.ip });

      res.json({
        accessToken,
        refreshToken: rawRefresh,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h',
        role: user.role
      });
    } catch (err) {
      console.error('POST /auth/login error:', err.message);
      res.status(500).json({ error: 'Login failed.' });
    }
  }
);

// POST /api/auth/refresh — rotate refresh token, issue new access token
router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('refreshToken is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    try {
      const result = await db.query(
        `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
                u.role, u.clinic_id
         FROM refresh_tokens rt
         JOIN users u ON u.id = rt.user_id
         WHERE rt.token_hash = $1`,
        [tokenHash]
      );

      const record = result.rows[0];

      if (!record || record.revoked || new Date(record.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Invalid or expired refresh token.' });
      }

      // Revoke old token
      await db.query(
        `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE id = $1`,
        [record.id]
      );

      // Issue new refresh token
      const rawRefresh = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
      const newHash = hashToken(rawRefresh);
      const expiresAt = refreshExpiresAt();

      await db.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [record.user_id, newHash, expiresAt]
      );

      const accessToken = signToken({ id: record.user_id, role: record.role, clinicId: record.clinic_id });

      res.json({
        accessToken,
        refreshToken: rawRefresh,
        expiresIn: process.env.JWT_EXPIRES_IN || '8h'
      });
    } catch (err) {
      console.error('POST /auth/refresh error:', err.message);
      res.status(500).json({ error: 'Token refresh failed.' });
    }
  }
);

// POST /api/auth/logout — revoke refresh token
router.post('/logout', authMiddleware, async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await db.query(
      `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW()
       WHERE token_hash = $1 AND user_id = $2`,
      [tokenHash, req.user.id]
    ).catch(() => {});
  }

  logAction(req.user.id, 'LOGOUT', 'user', { ip: req.ip });
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
