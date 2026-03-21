-- Rollback 005: Restore original audit_log action constraint
ALTER TABLE audit_log
  DROP CONSTRAINT IF EXISTS audit_log_action_check;

ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_action_check
  CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW'));

DROP INDEX IF EXISTS idx_audit_performed_at_brin;
