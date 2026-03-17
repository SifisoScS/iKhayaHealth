-- Migration 004: Encryption columns, auth tables, POPIA consent
-- =====================================================

-- =====================================================
-- PATIENT TABLE — Encryption columns for PII fields
-- These store the AES-256-GCM IV and authentication
-- tag alongside the ciphertext that lives in the
-- existing given_name / family_name columns.
-- =====================================================
ALTER TABLE patient
  ADD COLUMN IF NOT EXISTS given_name_iv       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS given_name_auth_tag  VARCHAR(64),
  ADD COLUMN IF NOT EXISTS family_name_iv       VARCHAR(64),
  ADD COLUMN IF NOT EXISTS family_name_auth_tag VARCHAR(64),
  ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ;

-- =====================================================
-- USERS TABLE — extend from migration 001 for production auth
-- Adds email-verified flag, failed login tracking, and
-- account lock for brute-force protection.
-- =====================================================
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS clinic_id             VARCHAR(100);

-- =====================================================
-- REFRESH TOKENS — single-use rotating refresh tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(128) NOT NULL UNIQUE, -- SHA-256 of the raw token
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  revoked      BOOLEAN DEFAULT FALSE,
  revoked_at   TIMESTAMPTZ,
  device_id    VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expiry ON refresh_tokens(expires_at);

-- =====================================================
-- PATIENT CONSENT — POPIA Section 11 lawful basis
-- =====================================================
CREATE TABLE IF NOT EXISTS patient_consent (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  consent_type VARCHAR(50) NOT NULL,  -- 'treatment', 'data_processing', 'photography', 'research'
  granted      BOOLEAN NOT NULL,
  granted_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  granted_by   UUID REFERENCES users(id),
  ip_address   INET,
  notes        TEXT,

  CONSTRAINT valid_consent_type CHECK (
    consent_type IN ('treatment', 'data_processing', 'photography', 'research', 'contact')
  )
);

CREATE INDEX IF NOT EXISTS idx_consent_patient ON patient_consent(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_type    ON patient_consent(patient_id, consent_type);

-- =====================================================
-- SCHEMA MIGRATIONS tracking table
-- (Used by the migration runner from migration 004 onward)
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  version     VARCHAR(50) PRIMARY KEY,
  applied_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
