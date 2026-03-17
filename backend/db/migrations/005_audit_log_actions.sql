-- Migration 005: Expand audit_log action CHECK constraint
-- The original constraint only allowed CREATE/UPDATE/DELETE/VIEW.
-- The application also uses LOGIN, LOGOUT, EXPORT, SYNC_PUSH, SYNC_PULL
-- which would cause constraint violations in production.

-- PostgreSQL doesn't support ALTER CONSTRAINT directly; drop and recreate.
ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_action_check
  CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'VIEW',
    'LOGIN', 'LOGOUT', 'EXPORT',
    'SYNC_PUSH', 'SYNC_PULL'
  ));

-- Add missing index on performed_at for time-range audit queries
CREATE INDEX IF NOT EXISTS idx_audit_performed_at_brin
  ON audit_log USING BRIN (performed_at);
