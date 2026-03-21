-- Rollback 004: Remove encryption columns, refresh tokens, consent table

DROP TABLE IF EXISTS patient_consent CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

ALTER TABLE users
  DROP COLUMN IF EXISTS failed_login_attempts,
  DROP COLUMN IF EXISTS locked_until,
  DROP COLUMN IF EXISTS clinic_id;

ALTER TABLE patient
  DROP COLUMN IF EXISTS given_name_iv,
  DROP COLUMN IF EXISTS given_name_auth_tag,
  DROP COLUMN IF EXISTS family_name_iv,
  DROP COLUMN IF EXISTS family_name_auth_tag,
  DROP COLUMN IF EXISTS deleted_at;
