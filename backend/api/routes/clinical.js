/**
 * Clinical sub-resources scoped to a patient.
 * Mounted at /api/patients/:patientId/
 *
 * Routes:
 *   Allergies:      GET|POST /allergies, PUT|DELETE /allergies/:id
 *   Medications:    GET|POST /medications, PUT /medications/:id
 *   Diagnoses:      GET|POST /diagnoses, PUT /diagnoses/:id
 *   Immunizations:  GET|POST /immunizations
 */
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const router = express.Router({ mergeParams: true }); // expose :patientId
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { logActionToDb } = require('../../../security/audit/logger');

router.use(authMiddleware);

const patientUuidParam = param('patientId').isUUID().withMessage('Invalid patient ID');
const resourceUuidParam = param('id').isUUID().withMessage('Invalid resource ID');

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  return null;
}

async function requirePatient(patientId, res) {
  const r = await db.query('SELECT id FROM patient WHERE id = $1 AND active = true', [patientId]);
  if (r.rowCount === 0) { res.status(404).json({ error: 'Patient not found' }); return false; }
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALLERGIES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/allergies', [patientUuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { patientId } = req.params;
  try {
    const result = await db.query(
      `SELECT id, allergen, allergy_type, category, reaction, severity, status, onset_date, notes
       FROM allergy WHERE patient_id = $1 ORDER BY recorded_date DESC`,
      [patientId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /allergies error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve allergies' });
  }
});

router.post(
  '/allergies',
  authorize('doctor', 'admin'),
  [
    patientUuidParam,
    body('allergen').trim().notEmpty().withMessage('allergen is required'),
    body('allergy_type').optional().isIn(['allergy', 'intolerance', 'adverse-reaction']),
    body('category').optional().isIn(['food', 'medication', 'environment', 'biologic']),
    body('severity').optional().isIn(['mild', 'moderate', 'severe', 'life-threatening']),
    body('reaction').optional().trim(),
    body('onset_date').optional().isISO8601(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId } = req.params;
    const { allergen, allergy_type = 'allergy', category, severity, reaction, onset_date, notes } = req.body;
    try {
      if (!await requirePatient(patientId, res)) return;
      const result = await db.query(
        `INSERT INTO allergy (patient_id, allergen, allergy_type, category, severity, reaction, onset_date, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, allergen, allergy_type, severity, status`,
        [patientId, allergen, allergy_type, category, severity, reaction, onset_date, notes, req.user.id]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'allergy', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /allergies error:', err.message);
      res.status(500).json({ error: 'Failed to create allergy' });
    }
  }
);

router.put(
  '/allergies/:id',
  authorize('doctor', 'admin'),
  [patientUuidParam, resourceUuidParam,
   body('status').optional().isIn(['active', 'inactive', 'resolved']),
   body('severity').optional().isIn(['mild', 'moderate', 'severe', 'life-threatening']),
   body('reaction').optional().trim(),
   body('notes').optional().trim()],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId, id } = req.params;
    const { status, severity, reaction, notes } = req.body;
    try {
      const result = await db.query(
        `UPDATE allergy SET status = COALESCE($1, status), severity = COALESCE($2, severity),
         reaction = COALESCE($3, reaction), notes = COALESCE($4, notes)
         WHERE id = $5 AND patient_id = $6 RETURNING id, allergen, status, severity`,
        [status, severity, reaction, notes, id, patientId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Allergy not found' });
      await logActionToDb(db, req.user.id, 'UPDATE', 'allergy', id, req);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /allergies/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update allergy' });
    }
  }
);

router.delete(
  '/allergies/:id',
  authorize('doctor', 'admin'),
  [patientUuidParam, resourceUuidParam],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId, id } = req.params;
    try {
      const result = await db.query(
        `UPDATE allergy SET status = 'inactive' WHERE id = $1 AND patient_id = $2 RETURNING id`,
        [id, patientId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Allergy not found' });
      await logActionToDb(db, req.user.id, 'DELETE', 'allergy', id, req);
      res.json({ message: 'Allergy deactivated', id });
    } catch (err) {
      console.error('DELETE /allergies/:id error:', err.message);
      res.status(500).json({ error: 'Failed to deactivate allergy' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// MEDICATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/medications', [patientUuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { patientId } = req.params;
  try {
    const result = await db.query(
      `SELECT id, medication_name, dosage, route, frequency, status, start_date, end_date, indication
       FROM medication WHERE patient_id = $1 ORDER BY start_date DESC`,
      [patientId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /medications error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve medications' });
  }
});

router.post(
  '/medications',
  authorize('doctor', 'admin'),
  [
    patientUuidParam,
    body('medication_name').trim().notEmpty().withMessage('medication_name is required'),
    body('start_date').isISO8601().withMessage('start_date must be ISO 8601'),
    body('dosage').optional().trim(),
    body('route').optional().isIn(['oral', 'IV', 'IM', 'topical', 'inhalation', 'subcutaneous']),
    body('frequency').optional().trim(),
    body('end_date').optional().isISO8601(),
    body('indication').optional().trim(),
    body('instructions').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId } = req.params;
    const { medication_name, start_date, dosage, route, frequency, end_date, indication, instructions } = req.body;
    try {
      if (!await requirePatient(patientId, res)) return;
      const result = await db.query(
        `INSERT INTO medication
           (patient_id, medication_name, start_date, dosage, route, frequency, end_date, indication, instructions, prescribed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, medication_name, dosage, status, start_date`,
        [patientId, medication_name, start_date, dosage, route, frequency, end_date, indication, instructions, req.user.id]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'medication', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /medications error:', err.message);
      res.status(500).json({ error: 'Failed to create medication' });
    }
  }
);

router.put(
  '/medications/:id',
  authorize('doctor', 'admin'),
  [patientUuidParam, resourceUuidParam,
   body('status').optional().isIn(['active', 'completed', 'stopped', 'on-hold']),
   body('end_date').optional().isISO8601(),
   body('instructions').optional().trim()],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId, id } = req.params;
    const { status, end_date, instructions } = req.body;
    try {
      const result = await db.query(
        `UPDATE medication SET status = COALESCE($1, status), end_date = COALESCE($2, end_date),
         instructions = COALESCE($3, instructions), updated_at = NOW()
         WHERE id = $4 AND patient_id = $5 RETURNING id, medication_name, status`,
        [status, end_date, instructions, id, patientId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Medication not found' });
      await logActionToDb(db, req.user.id, 'UPDATE', 'medication', id, req);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /medications/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update medication' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// DIAGNOSES
// ══════════════════════════════════════════════════════════════════════════════

router.get('/diagnoses', [patientUuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { patientId } = req.params;
  try {
    const result = await db.query(
      `SELECT id, condition_name, condition_code, category, severity, status, onset_date, notes
       FROM diagnosis WHERE patient_id = $1 ORDER BY recorded_date DESC`,
      [patientId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /diagnoses error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve diagnoses' });
  }
});

router.post(
  '/diagnoses',
  authorize('doctor', 'admin'),
  [
    patientUuidParam,
    body('condition_name').trim().notEmpty().withMessage('condition_name is required'),
    body('condition_code').optional().trim(),
    body('category').optional().isIn(['problem-list-item', 'encounter-diagnosis']),
    body('severity').optional().isIn(['mild', 'moderate', 'severe']),
    body('onset_date').optional().isISO8601(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId } = req.params;
    const { condition_name, condition_code, category, severity, onset_date, notes } = req.body;
    try {
      if (!await requirePatient(patientId, res)) return;
      const result = await db.query(
        `INSERT INTO diagnosis (patient_id, condition_name, condition_code, category, severity, onset_date, notes, recorded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, condition_name, condition_code, status`,
        [patientId, condition_name, condition_code, category, severity, onset_date, notes, req.user.id]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'diagnosis', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /diagnoses error:', err.message);
      res.status(500).json({ error: 'Failed to create diagnosis' });
    }
  }
);

router.put(
  '/diagnoses/:id',
  authorize('doctor', 'admin'),
  [patientUuidParam, resourceUuidParam,
   body('status').optional().isIn(['active', 'resolved', 'inactive']),
   body('resolved_date').optional().isISO8601(),
   body('notes').optional().trim()],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId, id } = req.params;
    const { status, resolved_date, notes } = req.body;
    try {
      const result = await db.query(
        `UPDATE diagnosis SET status = COALESCE($1, status),
         resolved_date = COALESCE($2::date, resolved_date), notes = COALESCE($3, notes)
         WHERE id = $4 AND patient_id = $5 RETURNING id, condition_name, status`,
        [status, resolved_date, notes, id, patientId]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Diagnosis not found' });
      await logActionToDb(db, req.user.id, 'UPDATE', 'diagnosis', id, req);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /diagnoses/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update diagnosis' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════════════════
// IMMUNIZATIONS
// ══════════════════════════════════════════════════════════════════════════════

router.get('/immunizations', [patientUuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { patientId } = req.params;
  try {
    const result = await db.query(
      `SELECT id, vaccine_name, vaccine_code, dose_number, total_doses,
              administration_date, lot_number, site, route, notes
       FROM immunization WHERE patient_id = $1 ORDER BY administration_date DESC`,
      [patientId]
    );
    res.json({ data: result.rows });
  } catch (err) {
    console.error('GET /immunizations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve immunizations' });
  }
});

router.post(
  '/immunizations',
  authorize('doctor', 'nurse', 'admin'),
  [
    patientUuidParam,
    body('vaccine_name').trim().notEmpty().withMessage('vaccine_name is required'),
    body('administration_date').isISO8601().withMessage('administration_date must be ISO 8601'),
    body('vaccine_code').optional().trim(),
    body('dose_number').optional().isInt({ min: 1 }),
    body('total_doses').optional().isInt({ min: 1 }),
    body('lot_number').optional().trim().escape(),
    body('site').optional().trim().escape(),
    body('route').optional().isIn(['intramuscular', 'subcutaneous', 'oral', 'intranasal']),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patientId } = req.params;
    const { vaccine_name, administration_date, vaccine_code, dose_number, total_doses, lot_number, site, route, notes } = req.body;
    try {
      if (!await requirePatient(patientId, res)) return;
      const result = await db.query(
        `INSERT INTO immunization
           (patient_id, vaccine_name, administration_date, vaccine_code, dose_number,
            total_doses, lot_number, site, route, notes, administered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, vaccine_name, administration_date, dose_number`,
        [patientId, vaccine_name, administration_date, vaccine_code, dose_number,
         total_doses, lot_number, site, route, notes, req.user.id]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'immunization', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /immunizations error:', err.message);
      res.status(500).json({ error: 'Failed to record immunization' });
    }
  }
);

module.exports = router;
