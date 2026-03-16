const express = require('express');
const { query: queryValidator, body, validationResult } = require('express-validator');
const router = express.Router();
const db = require('../../db/config');
const authMiddleware = require('../middleware/auth');
const { logAction } = require('../../../security/audit/logger');

router.use(authMiddleware);

// POST /api/sync/push
// Accepts a batch of pending records from a device and applies them to the server.
router.post(
  '/push',
  [
    body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
    body('records.*.entity_type').notEmpty().withMessage('entity_type is required'),
    body('records.*.entity_id').isUUID().withMessage('entity_id must be a UUID'),
    body('records.*.operation').isIn(['CREATE', 'UPDATE', 'DELETE']).withMessage('invalid operation'),
    body('records.*.data').isObject().withMessage('data must be an object'),
    body('records.*.device_id').notEmpty().withMessage('device_id is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const { records } = req.body;
    const results = { synced: 0, conflicts: [], errors: [] };

    for (const record of records) {
      const { entity_type, entity_id, operation, data, device_id, client_version } = record;

      try {
        if (entity_type === 'patient') {
          await syncPatient(entity_id, operation, data, device_id, client_version, req.user.id, results);
        } else {
          // Queue unknown entity types for manual review
          results.errors.push({ entity_id, reason: `Unsupported entity_type: ${entity_type}` });
        }
      } catch (err) {
        results.errors.push({ entity_id, reason: err.message });
      }
    }

    logAction(req.user.id, 'SYNC_PUSH', 'sync', {
      total: records.length,
      synced: results.synced,
      conflicts: results.conflicts.length
    });

    res.json(results);
  }
);

async function syncPatient(entityId, operation, data, deviceId, clientVersion, userId, results) {
  const current = await db.query(
    'SELECT id, version, updated_at FROM patient WHERE id = $1',
    [entityId]
  );
  const server = current.rows[0];

  if (operation === 'CREATE') {
    if (server) {
      // Record already exists — treat as conflict
      results.conflicts.push({ entity_id: entityId, reason: 'Record already exists on server' });
      return;
    }
    await db.query(
      `INSERT INTO patient (id, given_name, family_name, birth_date, gender, active,
                            device_id, sync_status, version, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, $6, 'synced', 1, $7, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [entityId, data.given_name, data.family_name, data.birth_date, data.gender, deviceId, userId]
    );
    results.synced++;
    return;
  }

  if (!server) {
    results.errors.push({ entity_id: entityId, reason: 'Record not found for UPDATE/DELETE' });
    return;
  }

  // Optimistic concurrency: reject if client version is behind server
  if (clientVersion !== undefined && server.version > clientVersion) {
    results.conflicts.push({
      entity_id: entityId,
      reason: 'Version conflict',
      server_version: server.version,
      client_version: clientVersion
    });
    return;
  }

  if (operation === 'UPDATE') {
    await db.query(
      `UPDATE patient
       SET given_name = COALESCE($1, given_name),
           family_name = COALESCE($2, family_name),
           birth_date = COALESCE($3, birth_date),
           gender = COALESCE($4, gender),
           sync_status = 'synced',
           version = version + 1,
           updated_by = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [data.given_name, data.family_name, data.birth_date, data.gender, userId, entityId]
    );
    results.synced++;
  } else if (operation === 'DELETE') {
    await db.query(
      `UPDATE patient SET active = false, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [userId, entityId]
    );
    results.synced++;
  }
}

// GET /api/sync/pull
// Returns all patient records updated since a given timestamp for a device.
router.get(
  '/pull',
  [
    queryValidator('since').optional().isISO8601().withMessage('since must be ISO 8601'),
    queryValidator('device_id').optional().trim().escape(),
    queryValidator('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }

    const since = req.query.since || new Date(0).toISOString();
    const deviceId = req.query.device_id;
    const limit = req.query.limit || 100;

    try {
      let queryText, queryParams;

      if (deviceId) {
        // Exclude records originated from this device (already on device)
        queryText = `
          SELECT id, given_name, family_name, birth_date, gender, active,
                 version, sync_status, updated_at, device_id
          FROM patient
          WHERE updated_at > $1
            AND (device_id IS NULL OR device_id != $2)
          ORDER BY updated_at ASC
          LIMIT $3
        `;
        queryParams = [since, deviceId, limit];
      } else {
        queryText = `
          SELECT id, given_name, family_name, birth_date, gender, active,
                 version, sync_status, updated_at, device_id
          FROM patient
          WHERE updated_at > $1
          ORDER BY updated_at ASC
          LIMIT $2
        `;
        queryParams = [since, limit];
      }

      const result = await db.query(queryText, queryParams);
      const lastSynced = result.rows.length > 0
        ? result.rows[result.rows.length - 1].updated_at
        : since;

      logAction(req.user.id, 'SYNC_PULL', 'sync', { since, count: result.rowCount });

      res.json({
        records: result.rows,
        count: result.rowCount,
        since,
        lastSynced
      });
    } catch (err) {
      console.error('GET /sync/pull error:', err.message);
      res.status(500).json({ error: 'Sync pull failed.' });
    }
  }
);

module.exports = router;
