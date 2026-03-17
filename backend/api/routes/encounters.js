const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { logActionToDb } = require('../../../security/audit/logger');

router.use(authMiddleware);

const uuidParam = param('id').isUUID().withMessage('Invalid encounter ID');
const patientUuidBody = body('patient_id').isUUID().withMessage('patient_id must be a valid UUID');

function validate(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  return null;
}

// ── GET /api/encounters?patient_id=UUID ──────────────────────────────────────
router.get(
  '/',
  [query('patient_id').isUUID().withMessage('patient_id query param must be a UUID')],
  async (req, res) => {
    if (validate(req, res)) return;
    const { patient_id } = req.query;
    try {
      const result = await db.query(
        `SELECT id, encounter_type, status, start_time, end_time,
                location, chief_complaint, created_at
         FROM encounter
         WHERE patient_id = $1
         ORDER BY start_time DESC`,
        [patient_id]
      );
      res.json({ data: result.rows, count: result.rowCount });
    } catch (err) {
      console.error('GET /encounters error:', err.message);
      res.status(500).json({ error: 'Failed to retrieve encounters' });
    }
  }
);

// ── GET /api/encounters/:id ──────────────────────────────────────────────────
router.get('/:id', [uuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { id } = req.params;
  try {
    const [encResult, obsResult] = await Promise.all([
      db.query('SELECT * FROM encounter WHERE id = $1', [id]),
      db.query(
        `SELECT id, code, display, category, value_quantity, value_string,
                unit, interpretation, effective_time, notes
         FROM observation WHERE encounter_id = $1 ORDER BY effective_time ASC`,
        [id]
      )
    ]);
    if (encResult.rowCount === 0) return res.status(404).json({ error: 'Encounter not found' });

    await logActionToDb(db, req.user.id, 'VIEW', 'encounter', id, req);
    res.json({ ...encResult.rows[0], observations: obsResult.rows });
  } catch (err) {
    console.error('GET /encounters/:id error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve encounter' });
  }
});

// ── POST /api/encounters ─────────────────────────────────────────────────────
router.post(
  '/',
  authorize('doctor', 'admin'),
  [
    patientUuidBody,
    body('start_time').isISO8601().withMessage('start_time must be ISO 8601'),
    body('encounter_type')
      .optional()
      .isIn(['ambulatory', 'emergency', 'inpatient', 'home_visit'])
      .withMessage('invalid encounter_type'),
    body('chief_complaint').optional().trim().escape(),
    body('reason_for_visit').optional().trim().escape(),
    body('location').optional().trim().escape()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const {
      patient_id, start_time, encounter_type = 'ambulatory',
      chief_complaint, reason_for_visit, location
    } = req.body;
    try {
      const result = await db.query(
        `INSERT INTO encounter
           (patient_id, encounter_type, status, start_time,
            chief_complaint, reason_for_visit, location, created_by)
         VALUES ($1, $2, 'in-progress', $3, $4, $5, $6, $7)
         RETURNING id, patient_id, encounter_type, status, start_time, created_at`,
        [patient_id, encounter_type, start_time, chief_complaint, reason_for_visit, location, req.user.id]
      );
      const created = result.rows[0];
      await logActionToDb(db, req.user.id, 'CREATE', 'encounter', created.id, req);
      res.status(201).json(created);
    } catch (err) {
      console.error('POST /encounters error:', err.message);
      res.status(500).json({ error: 'Failed to create encounter' });
    }
  }
);

// ── PUT /api/encounters/:id ──────────────────────────────────────────────────
router.put(
  '/:id',
  authorize('doctor', 'admin'),
  [
    uuidParam,
    body('status')
      .optional()
      .isIn(['planned', 'in-progress', 'finished', 'cancelled'])
      .withMessage('invalid status'),
    body('end_time').optional().isISO8601().withMessage('end_time must be ISO 8601'),
    body('assessment').optional().trim(),
    body('plan').optional().trim(),
    body('notes').optional().trim(),
    body('history_present_illness').optional().trim(),
    body('physical_exam').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { id } = req.params;
    const { status, end_time, assessment, plan, notes, history_present_illness, physical_exam } = req.body;
    try {
      const result = await db.query(
        `UPDATE encounter
         SET status = COALESCE($1, status),
             end_time = COALESCE($2, end_time),
             assessment = COALESCE($3, assessment),
             plan = COALESCE($4, plan),
             notes = COALESCE($5, notes),
             history_present_illness = COALESCE($6, history_present_illness),
             physical_exam = COALESCE($7, physical_exam),
             updated_at = NOW()
         WHERE id = $8
         RETURNING id, status, end_time, updated_at`,
        [status, end_time, assessment, plan, notes, history_present_illness, physical_exam, id]
      );
      if (result.rowCount === 0) return res.status(404).json({ error: 'Encounter not found' });

      await logActionToDb(db, req.user.id, 'UPDATE', 'encounter', id, req);
      res.json(result.rows[0]);
    } catch (err) {
      console.error('PUT /encounters/:id error:', err.message);
      res.status(500).json({ error: 'Failed to update encounter' });
    }
  }
);

// ── POST /api/encounters/:id/observations ────────────────────────────────────
// Nurses and doctors can record vitals
router.post(
  '/:id/observations',
  authorize('doctor', 'nurse', 'admin'),
  [
    uuidParam,
    body('code').notEmpty().withMessage('LOINC code is required'),
    body('display').optional().trim(),
    body('category').optional().isIn(['vital-signs', 'laboratory', 'imaging']).withMessage('invalid category'),
    body('value_quantity').optional().isNumeric().withMessage('value_quantity must be numeric'),
    body('value_string').optional().trim(),
    body('unit').optional().trim().escape(),
    body('interpretation')
      .optional()
      .isIn(['normal', 'high', 'low', 'critical'])
      .withMessage('invalid interpretation'),
    body('effective_time').optional().isISO8601().withMessage('effective_time must be ISO 8601'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    if (validate(req, res)) return;
    const { id: encounter_id } = req.params;
    const {
      code, display, category = 'vital-signs',
      value_quantity, value_string, unit,
      interpretation, effective_time, notes
    } = req.body;

    try {
      // Verify encounter exists and get patient_id
      const enc = await db.query('SELECT patient_id FROM encounter WHERE id = $1', [encounter_id]);
      if (enc.rowCount === 0) return res.status(404).json({ error: 'Encounter not found' });

      const result = await db.query(
        `INSERT INTO observation
           (encounter_id, patient_id, code, display, category,
            value_quantity, value_string, unit, interpretation,
            effective_time, performer_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9,
                 COALESCE($10::timestamptz, NOW()), $11, $12)
         RETURNING id, code, display, value_quantity, value_string, unit, interpretation, effective_time`,
        [
          encounter_id, enc.rows[0].patient_id, code, display, category,
          value_quantity ?? null, value_string ?? null, unit ?? null,
          interpretation ?? null, effective_time ?? null,
          req.user.id, notes ?? null
        ]
      );
      await logActionToDb(db, req.user.id, 'CREATE', 'observation', result.rows[0].id, req);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('POST /encounters/:id/observations error:', err.message);
      res.status(500).json({ error: 'Failed to record observation' });
    }
  }
);

// ── GET /api/encounters/:id/observations ─────────────────────────────────────
router.get('/:id/observations', [uuidParam], async (req, res) => {
  if (validate(req, res)) return;
  const { id: encounter_id } = req.params;
  try {
    const enc = await db.query('SELECT id FROM encounter WHERE id = $1', [encounter_id]);
    if (enc.rowCount === 0) return res.status(404).json({ error: 'Encounter not found' });

    const result = await db.query(
      `SELECT id, code, display, category, value_quantity, value_string,
              unit, interpretation, effective_time, notes
       FROM observation WHERE encounter_id = $1 ORDER BY effective_time ASC`,
      [encounter_id]
    );
    res.json({ data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('GET /encounters/:id/observations error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve observations' });
  }
});

module.exports = router;
