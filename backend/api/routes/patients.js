const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { logAction, logActionToDb } = require('../../../security/audit/logger');
const EncryptionService = require('../../../security/encryption/aes');

// Encryption key must be 32 bytes. Derive from env var (hex-encoded 64-char string).
const encKey = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : null;
const encryption = encKey ? new EncryptionService(encKey) : null;

function encryptField(value) {
  if (!encryption || value == null) return { value, iv: null, authTag: null };
  const result = encryption.encrypt(String(value));
  return { value: result.encrypted, iv: result.iv, authTag: result.authTag };
}

function decryptField(encrypted, iv, authTag) {
  if (!encryption || !iv || !authTag) return encrypted;
  try {
    return encryption.decrypt(encrypted, iv, authTag);
  } catch {
    return encrypted;
  }
}

// Validation helpers
const uuidParam = param('id').isUUID().withMessage('Invalid patient ID');

const patientBodyRules = [
  body('given_name').trim().notEmpty().withMessage('given_name is required'),
  body('family_name').trim().notEmpty().withMessage('family_name is required'),
  body('birth_date').isISO8601().withMessage('birth_date must be a valid ISO 8601 date'),
  body('gender').isIn(['male', 'female', 'other', 'unknown']).withMessage('gender must be male|female|other|unknown'),
  body('phone').optional().trim().escape(),
  body('address').optional().trim().escape()
];

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  return null;
}

// All patient routes require authentication
router.use(authMiddleware);

// GET /api/patients — paginated list with optional name search
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim().escape()
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const page = req.query.page || 1;
    const limit = req.query.limit || 20;
    const offset = (page - 1) * limit;
    const search = req.query.search;

    try {
      let queryText, queryParams;
      if (search) {
        queryText = `
          SELECT id, given_name, family_name, birth_date, gender, active, created_at
          FROM patient
          WHERE active = true
            AND to_tsvector('english', given_name || ' ' || family_name) @@ plainto_tsquery($1)
          ORDER BY family_name, given_name
          LIMIT $2 OFFSET $3
        `;
        queryParams = [search, limit, offset];
      } else {
        queryText = `
          SELECT id, given_name, family_name, birth_date, gender, active, created_at
          FROM patient
          WHERE active = true
          ORDER BY family_name, given_name
          LIMIT $1 OFFSET $2
        `;
        queryParams = [limit, offset];
      }

      const result = await db.query(queryText, queryParams);
      res.json({ data: result.rows, page, limit, count: result.rowCount });
    } catch (error) {
      console.error('GET /patients error:', error.message);
      res.status(500).json({ error: 'Failed to retrieve patients' });
    }
  }
);

// GET /api/patients/:id — single patient
router.get('/:id', [uuidParam], async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return validationError;

  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT p.*, array_agg(DISTINCT e.id) AS encounter_ids
       FROM patient p
       LEFT JOIN encounter e ON e.patient_id = p.id
       WHERE p.id = $1 AND p.active = true
       GROUP BY p.id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = result.rows[0];
    // Decrypt PII fields if encryption is active
    if (encryption) {
      patient.given_name = decryptField(patient.given_name, patient.given_name_iv, patient.given_name_auth_tag);
      patient.family_name = decryptField(patient.family_name, patient.family_name_iv, patient.family_name_auth_tag);
    }
    // Strip encryption internals — never expose IV/auth_tag to clients
    delete patient.given_name_iv;
    delete patient.given_name_auth_tag;
    delete patient.family_name_iv;
    delete patient.family_name_auth_tag;

    await logActionToDb(db, req.user.id, 'VIEW', 'patient', id, req);
    res.json(patient);
  } catch (error) {
    console.error('GET /patients/:id error:', error.message);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// POST /api/patients — create new patient (doctors and admins only)
router.post(
  '/',
  authorize('doctor', 'admin'),
  patientBodyRules,
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { given_name, family_name, birth_date, gender, phone, address } = req.body;

    // Encrypt PII fields
    const givenEnc = encryptField(given_name);
    const familyEnc = encryptField(family_name);

    try {
      const result = await db.query(
        `INSERT INTO patient
           (given_name, given_name_iv, given_name_auth_tag,
            family_name, family_name_iv, family_name_auth_tag,
            birth_date, gender, active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
         RETURNING id, birth_date, gender, active, created_at`,
        [
          givenEnc.value, givenEnc.iv, givenEnc.authTag,
          familyEnc.value, familyEnc.iv, familyEnc.authTag,
          birth_date, gender, req.user.id
        ]
      );

      const created = result.rows[0];
      await logActionToDb(db, req.user.id, 'CREATE', 'patient', created.id, req);
      res.status(201).json({ ...created, given_name, family_name });
    } catch (error) {
      console.error('POST /patients error:', error.message);
      res.status(500).json({ error: 'Failed to create patient' });
    }
  }
);

// PUT /api/patients/:id — update patient (doctors and admins only)
router.put(
  '/:id',
  authorize('doctor', 'admin'),
  [uuidParam, ...patientBodyRules],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    const { given_name, family_name, birth_date, gender } = req.body;

    const givenEnc = encryptField(given_name);
    const familyEnc = encryptField(family_name);

    try {
      const result = await db.query(
        `UPDATE patient
         SET given_name = $1, given_name_iv = $2, given_name_auth_tag = $3,
             family_name = $4, family_name_iv = $5, family_name_auth_tag = $6,
             birth_date = $7, gender = $8, updated_at = NOW(), updated_by = $9
         WHERE id = $10 AND active = true
         RETURNING id, birth_date, gender, updated_at`,
        [
          givenEnc.value, givenEnc.iv, givenEnc.authTag,
          familyEnc.value, familyEnc.iv, familyEnc.authTag,
          birth_date, gender, req.user.id, id
        ]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      await logActionToDb(db, req.user.id, 'UPDATE', 'patient', id, req);
      res.json({ ...result.rows[0], given_name, family_name });
    } catch (error) {
      console.error('PUT /patients/:id error:', error.message);
      res.status(500).json({ error: 'Failed to update patient' });
    }
  }
);

// DELETE /api/patients/:id — soft delete (admins only)
router.delete(
  '/:id',
  authorize('admin'),
  [uuidParam],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return validationError;

    const { id } = req.params;
    try {
      const result = await db.query(
        `UPDATE patient SET active = false, updated_at = NOW(), updated_by = $1
         WHERE id = $2 AND active = true
         RETURNING id`,
        [req.user.id, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      await logActionToDb(db, req.user.id, 'DELETE', 'patient', id, req);
      res.json({ message: 'Patient deactivated', id });
    } catch (error) {
      console.error('DELETE /patients/:id error:', error.message);
      res.status(500).json({ error: 'Failed to deactivate patient' });
    }
  }
);

// GET /api/patients/:id/export — POPIA data subject access (all authenticated roles)
router.get('/:id/export', [uuidParam], async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return validationError;

  const { id } = req.params;
  try {
    const [patientRes, encountersRes, allergiesRes, medsRes, diagnosesRes, immunizationsRes] =
      await Promise.all([
        db.query('SELECT * FROM patient WHERE id = $1 AND active = true', [id]),
        db.query('SELECT * FROM encounter WHERE patient_id = $1 ORDER BY start_date DESC', [id]),
        db.query('SELECT * FROM allergy WHERE patient_id = $1', [id]),
        db.query('SELECT * FROM medication WHERE patient_id = $1', [id]),
        db.query('SELECT * FROM diagnosis WHERE patient_id = $1', [id]),
        db.query('SELECT * FROM immunization WHERE patient_id = $1 ORDER BY administration_date DESC', [id]),
      ]);

    if (patientRes.rowCount === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patient = patientRes.rows[0];
    // Decrypt PII if encryption is active
    if (encryption) {
      patient.given_name = decryptField(patient.given_name, patient.given_name_iv, patient.given_name_auth_tag);
      patient.family_name = decryptField(patient.family_name, patient.family_name_iv, patient.family_name_auth_tag);
    }
    // Strip encryption internals — never expose IV/auth_tag to clients
    delete patient.given_name_iv;
    delete patient.given_name_auth_tag;
    delete patient.family_name_iv;
    delete patient.family_name_auth_tag;

    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.id,
      patient,
      encounters: encountersRes.rows,
      allergies: allergiesRes.rows,
      medications: medsRes.rows,
      diagnoses: diagnosesRes.rows,
      immunizations: immunizationsRes.rows,
    };

    await logActionToDb(db, req.user.id, 'EXPORT', 'patient', id, req);

    res
      .set('Content-Disposition', `attachment; filename="patient-${id}-export.json"`)
      .set('Content-Type', 'application/json')
      .json(exportData);
  } catch (error) {
    console.error('GET /patients/:id/export error:', error.message);
    res.status(500).json({ error: 'Failed to export patient data' });
  }
});

module.exports = router;
