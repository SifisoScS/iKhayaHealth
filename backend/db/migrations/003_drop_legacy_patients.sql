-- Migration 003: Drop legacy patients table (plural) from 001_initial_schema.sql
--
-- The canonical FHIR-aligned schema uses the singular `patient` table defined in
-- 002_patient_records.sql. The `patients` (plural) table created by 001 uses a
-- different schema and will cause confusion and silent query failures if both exist.
-- Drop it and all dependent objects (visits, vitals, users, audit_logs, sync_queue
-- from migration 001) in favour of the 002 schema.
--
-- WARNING: Only run this migration if 001 was previously applied. Running it on a
-- fresh database where only 002 has been applied is safe (IF EXISTS guards are used).

DROP TABLE IF EXISTS sync_queue CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS vitals CASCADE;
DROP TABLE IF EXISTS visits CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
