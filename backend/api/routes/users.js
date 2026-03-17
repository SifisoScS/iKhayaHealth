/**
 * Staff user management — admin only.
 * Mounted at /api/users
 */
const express = require('express');
const bcrypt = require('bcrypt');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { logActionToDb } = require('../../../security/audit/logger');

const BCRYPT_ROUNDS = 12;

router.use(authMiddleware);
router.use(authorize('admin'));

const uuidParam = param('id').isUUID().withMessage('Invalid user ID');

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  return null;
}

// ── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, role, clinic_id, active, last_login, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json({ data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('GET /users error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// ── GET /api/users/:id ───────────────────────────────────────────────────────
router.get('/:id', [uuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT id, username, role, clinic_id, active, last_login,
              failed_login_attempts, locked_until, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /users/:id error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve user' });
  }
});

// ── POST /api/users ──────────────────────────────────────────────────────────
router.post(
  '/',
  [
    body('username')
      .trim()
      .notEmpty().withMessage('username is required')
      .isLength({ min: 3, max: 50 }).withMessage('username must be 3-50 characters')
      .matches(/^[a-zA-Z0-9_.-]+$/).withMessage('username may only contain letters, digits, _ . -'),
    body('password')
      .isLength({ min: 12 }).withMessage('password must be at least 12 characters'),
    body('role')
      .isIn(['admin', 'doctor', 'nurse']).withMessage('role must be admin, doctor, or nurse'),
    body('clinic_id').optional().isUUID().withMessage('clinic_id must be a UUID')
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { username, password, role, clinic_id } = req.body;
    try {
      const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
      if (existing.rowCount > 0) {
        return res.status(409).json({ error: 'Username already exists' });
      }

      const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const result = await db.query(
        `INSERT INTO users (username, password_hash, role, clinic_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, username, role, clinic_id, active, created_at`,
        [username, password_hash, role, clinic_id ?? null]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'user', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /users error:', err.message);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// ── PUT /api/users/:id ───────────────────────────────────────────────────────
router.put(
  '/:id',
  [
    uuidParam,
    body('role').optional().isIn(['admin', 'doctor', 'nurse']).withMessage('invalid role'),
    body('active').optional().isBoolean().withMessage('active must be boolean'),
    body('clinic_id').optional().isUUID().withMessage('clinic_id must be a UUID'),
    body('locked_until').optional().isISO8601().withMessage('locked_until must be ISO 8601')
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { id } = req.params;
    const { role, active, clinic_id, locked_until } = req.body;
    try {
      const result = await db.query(
        `UPDATE users
         SET role = COALESCE($1, role),
             active = COALESCE($2, active),
             clinic_id = COALESCE($3, clinic_id),
             locked_until = COALESCE($4::timestamptz, locked_until)
         WHERE id = $5
         RETURNING id, username, role, active, clinic_id`,
        [role, active ?? null, clinic_id ?? null, locked_until ?? null, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'User not found' });
      await logActionToDb(db, req.user.id, 'UPDATE', 'user', id, req);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /users/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// ── DELETE /api/users/:id — soft delete ──────────────────────────────────────
router.delete('/:id', [uuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Cannot deactivate your own account' });
  try {
    const result = await db.query(
      `UPDATE users SET active = false WHERE id = $1 AND active = true RETURNING id, username`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found or already inactive' });
    await logActionToDb(db, req.user.id, 'DELETE', 'user', id, req);
    res.json({ message: 'User deactivated', id });
  } catch (err) {
    console.error('DELETE /users/:id error:', err.message);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

module.exports = router;
