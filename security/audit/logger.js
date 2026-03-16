const winston = require('winston');

const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'audit.log' })
  ]
});

/**
 * Write an audit entry to the log file.
 * Use this for lightweight logging where a DB connection isn't available.
 */
function logAction(userId, action, resource, details) {
  auditLogger.info({
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
}

/**
 * Write an audit entry to both the log file AND the `audit_log` DB table.
 * Use this for all patient data operations to satisfy POPIA audit requirements.
 *
 * @param {object} db      - The db module from backend/db/config.js
 * @param {string} userId  - UUID of the user performing the action
 * @param {string} action  - 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW'
 * @param {string} entityType - e.g. 'patient'
 * @param {string} entityId   - UUID of the affected record
 * @param {object} [req]   - Express request object (for ip_address, user_agent)
 * @param {object} [changes]  - Optional JSONB diff of old→new values
 */
async function logActionToDb(db, userId, action, entityType, entityId, req, changes) {
  // Always write to file first (never fails even if DB is down)
  logAction(userId, action, entityType, { entityId, ip: req?.ip });

  try {
    await db.query(
      `INSERT INTO audit_log
         (entity_type, entity_id, action, performed_by, ip_address, user_agent, changes, device_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entityType,
        entityId,
        action,
        userId,
        req?.ip || null,
        req?.headers?.['user-agent'] || null,
        changes ? JSON.stringify(changes) : null,
        req?.headers?.['x-device-id'] || null,
      ]
    );
  } catch (err) {
    // Log failure to file but don't throw — never let audit failure break the main flow
    auditLogger.error({ message: 'Failed to write audit_log to DB', userId, action, entityType, entityId, error: err.message });
  }
}

module.exports = { logAction, logActionToDb };
