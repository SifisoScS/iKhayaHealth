-- Migration 003: Drop legacy tables from 001_initial_schema.sql
--
-- The canonical FHIR-aligned schema uses tables defined in 002_patient_records.sql.
-- Migration 001 created conflicting legacy tables that cause silent query failures.
-- This migration removes them EXCEPT for `users`, which is still required by the
-- auth system and is not yet redefined in the 002 schema.
--
-- NOTE: The `users` table from 001 is intentionally preserved here.
--       Migration 004 will add auth-specific columns to it.
--
-- WARNING: Only run this migration if 001 was previously applied.
--          Running on a fresh database (only 002 applied) is safe — IF EXISTS guards.

DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vitals CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
-- `users` is intentionally NOT dropped — auth routes depend on it.
