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

function logAction(userId, action, resource, details) {
  auditLogger.info({
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  });
}

module.exports = { logAction };
