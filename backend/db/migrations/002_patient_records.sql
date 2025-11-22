-- =====================================================
-- iKhaya Health - Patient Record Database Schema
-- Based on FHIR standards with offline-first design
-- Version: 1.0.0
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE PATIENT TABLE
-- =====================================================
CREATE TABLE patient (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Name fields
  given_name VARCHAR(100) NOT NULL,
  family_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  preferred_name VARCHAR(100),
  
  -- Demographics
  birth_date DATE NOT NULL,
  gender VARCHAR(20) NOT NULL CHECK (gender IN ('male', 'female', 'other', 'unknown')),
  primary_language VARCHAR(10) DEFAULT 'en', -- ISO 639-1 codes
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  deceased BOOLEAN DEFAULT FALSE,
  deceased_date TIMESTAMPTZ,
  
  -- Photo
  photo_path VARCHAR(255), -- Local file path or S3 key
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID, -- References user table
  updated_by UUID,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict')),
  last_synced_at TIMESTAMPTZ,
  device_id VARCHAR(100), -- Which device created/last modified
  version INTEGER DEFAULT 1 -- For conflict resolution
);

-- Indexes for performance
CREATE INDEX idx_patient_family_name ON patient(family_name);
CREATE INDEX idx_patient_given_name ON patient(given_name);
CREATE INDEX idx_patient_birth_date ON patient(birth_date);
CREATE INDEX idx_patient_active ON patient(active);
CREATE INDEX idx_patient_sync_status ON patient(sync_status);
CREATE INDEX idx_patient_device_id ON patient(device_id);

-- Full-text search index
CREATE INDEX idx_patient_search ON patient USING gin(
  to_tsvector('english', coalesce(given_name, '') || ' ' || coalesce(family_name, '') || ' ' || coalesce(middle_name, ''))
);

-- =====================================================
-- PATIENT IDENTIFIERS
-- =====================================================
CREATE TABLE patient_identifier (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  identifier_type VARCHAR(50) NOT NULL, -- 'MRN', 'NATIONAL_ID', 'PASSPORT', 'INSURANCE'
  identifier_value VARCHAR(100) NOT NULL,
  issuing_organization VARCHAR(200),
  
  active BOOLEAN DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100),
  
  UNIQUE(identifier_type, identifier_value)
);

CREATE INDEX idx_identifier_patient ON patient_identifier(patient_id);
CREATE INDEX idx_identifier_value ON patient_identifier(identifier_value);
CREATE INDEX idx_identifier_type ON patient_identifier(identifier_type);

-- =====================================================
-- CONTACT POINTS (Phone, Email, Address)
-- =====================================================
CREATE TABLE contact_point (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('phone', 'mobile', 'email', 'address')),
  value TEXT NOT NULL,
  use_type VARCHAR(20) CHECK (use_type IN ('home', 'work', 'temp', 'mobile')),
  
  preferred BOOLEAN DEFAULT FALSE,
  active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_contact_patient ON contact_point(patient_id);
CREATE INDEX idx_contact_type ON contact_point(contact_type);

-- =====================================================
-- EMERGENCY CONTACTS
-- =====================================================
CREATE TABLE emergency_contact (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  name VARCHAR(200) NOT NULL,
  relationship VARCHAR(50), -- 'spouse', 'parent', 'sibling', 'friend'
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(100),
  
  priority INTEGER DEFAULT 1, -- 1 = primary, 2 = secondary
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_emergency_patient ON emergency_contact(patient_id);

-- =====================================================
-- ENCOUNTERS (Visits)
-- =====================================================
CREATE TABLE encounter (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  encounter_type VARCHAR(50) DEFAULT 'ambulatory', -- 'ambulatory', 'emergency', 'inpatient', 'home_visit'
  status VARCHAR(20) DEFAULT 'in-progress' CHECK (status IN ('planned', 'in-progress', 'finished', 'cancelled')),
  
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  
  location VARCHAR(200),
  provider_id UUID, -- References staff/user table
  
  chief_complaint TEXT,
  reason_for_visit TEXT,
  
  -- Clinical notes (structured)
  history_present_illness TEXT,
  review_of_systems TEXT,
  physical_exam TEXT,
  assessment TEXT,
  plan TEXT,
  notes TEXT, -- Free text notes
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  device_id VARCHAR(100),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_encounter_patient ON encounter(patient_id);
CREATE INDEX idx_encounter_start_time ON encounter(start_time);
CREATE INDEX idx_encounter_status ON encounter(status);
CREATE INDEX idx_encounter_provider ON encounter(provider_id);
CREATE INDEX idx_encounter_sync_status ON encounter(sync_status);

-- =====================================================
-- OBSERVATIONS (Vitals & Measurements)
-- =====================================================
CREATE TABLE observation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID REFERENCES encounter(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  -- LOINC-based codes (with fallback)
  code VARCHAR(50) NOT NULL, -- e.g., '85354-9' for blood pressure
  display VARCHAR(200), -- Human-readable name
  category VARCHAR(50) DEFAULT 'vital-signs', -- 'vital-signs', 'laboratory', 'imaging'
  
  -- Value (polymorphic - only one should be filled)
  value_quantity NUMERIC(10,2),
  value_string TEXT,
  value_boolean BOOLEAN,
  unit VARCHAR(50),
  
  -- Reference ranges
  reference_low NUMERIC(10,2),
  reference_high NUMERIC(10,2),
  interpretation VARCHAR(20), -- 'normal', 'high', 'low', 'critical'
  
  effective_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  performer_id UUID, -- Who took the measurement
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_observation_encounter ON observation(encounter_id);
CREATE INDEX idx_observation_patient ON observation(patient_id);
CREATE INDEX idx_observation_code ON observation(code);
CREATE INDEX idx_observation_effective_time ON observation(effective_time);

-- Common vital sign codes (LOINC)
COMMENT ON COLUMN observation.code IS 
  '85354-9: Blood pressure
   8310-5: Body temperature
   8867-4: Heart rate
   9279-1: Respiratory rate
   29463-7: Body weight
   8302-2: Body height
   39156-5: BMI
   2710-2: Oxygen saturation';

-- =====================================================
-- ALLERGIES & INTOLERANCES
-- =====================================================
CREATE TABLE allergy (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  allergen VARCHAR(200) NOT NULL, -- Substance name
  allergen_code VARCHAR(50), -- SNOMED CT code if available
  
  allergy_type VARCHAR(50) DEFAULT 'allergy', -- 'allergy', 'intolerance', 'adverse-reaction'
  category VARCHAR(50), -- 'food', 'medication', 'environment', 'biologic'
  
  reaction TEXT, -- Description of reaction
  severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'life-threatening')),
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'resolved')),
  
  onset_date DATE,
  recorded_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID,
  
  notes TEXT,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_allergy_patient ON allergy(patient_id);
CREATE INDEX idx_allergy_status ON allergy(status);

-- =====================================================
-- MEDICATIONS
-- =====================================================
CREATE TABLE medication (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounter(id),
  
  medication_name VARCHAR(200) NOT NULL,
  medication_code VARCHAR(50), -- RxNorm code if available
  
  dosage VARCHAR(200), -- e.g., "500mg twice daily"
  route VARCHAR(50), -- 'oral', 'IV', 'topical', 'inhalation'
  frequency VARCHAR(100), -- 'twice daily', 'as needed', 'every 6 hours'
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped', 'on-hold')),
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  prescribed_by UUID, -- Provider ID
  prescribed_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  indication TEXT, -- Why prescribed
  instructions TEXT, -- Patient instructions
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_medication_patient ON medication(patient_id);
CREATE INDEX idx_medication_status ON medication(status);
CREATE INDEX idx_medication_start_date ON medication(start_date);

-- =====================================================
-- DIAGNOSES / PROBLEMS
-- =====================================================
CREATE TABLE diagnosis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounter(id),
  
  condition_name VARCHAR(200) NOT NULL,
  condition_code VARCHAR(20), -- ICD-10 code if available
  
  category VARCHAR(50), -- 'problem-list-item', 'encounter-diagnosis'
  severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe')),
  
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'inactive')),
  
  onset_date DATE,
  resolved_date DATE,
  recorded_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  recorded_by UUID,
  
  notes TEXT,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_diagnosis_patient ON diagnosis(patient_id);
CREATE INDEX idx_diagnosis_status ON diagnosis(status);
CREATE INDEX idx_diagnosis_encounter ON diagnosis(encounter_id);

-- =====================================================
-- IMMUNIZATIONS
-- =====================================================
CREATE TABLE immunization (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  
  vaccine_name VARCHAR(200) NOT NULL,
  vaccine_code VARCHAR(50), -- CVX code if available
  
  dose_number INTEGER,
  total_doses INTEGER,
  
  administration_date DATE NOT NULL,
  expiration_date DATE,
  lot_number VARCHAR(100),
  
  site VARCHAR(50), -- 'left arm', 'right arm', 'thigh'
  route VARCHAR(50), -- 'intramuscular', 'subcutaneous', 'oral'
  
  administered_by UUID,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_immunization_patient ON immunization(patient_id);
CREATE INDEX idx_immunization_date ON immunization(administration_date);

-- =====================================================
-- DOCUMENTS (Metadata only - files stored separately)
-- =====================================================
CREATE TABLE document (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patient(id) ON DELETE CASCADE,
  encounter_id UUID REFERENCES encounter(id),
  
  title VARCHAR(200) NOT NULL,
  description TEXT,
  document_type VARCHAR(50), -- 'lab-report', 'x-ray', 'consent-form', 'discharge-summary'
  
  mime_type VARCHAR(100), -- 'application/pdf', 'image/jpeg'
  file_size INTEGER, -- Bytes
  file_hash VARCHAR(64), -- SHA-256 hash for integrity
  
  storage_path VARCHAR(500), -- S3 key or local file path
  
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  -- Offline sync
  sync_status VARCHAR(20) DEFAULT 'pending',
  device_id VARCHAR(100)
);

CREATE INDEX idx_document_patient ON document(patient_id);
CREATE INDEX idx_document_encounter ON document(encounter_id);
CREATE INDEX idx_document_type ON document(document_type);

-- =====================================================
-- AUDIT LOG (Append-only)
-- =====================================================
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  
  entity_type VARCHAR(50) NOT NULL, -- 'patient', 'encounter', 'observation'
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'VIEW')),
  
  changes JSONB, -- Old and new values
  
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  
  ip_address INET,
  user_agent TEXT,
  reason TEXT, -- Optional reason for change
  
  device_id VARCHAR(100),
  
  -- Never delete audit logs
  CONSTRAINT no_delete CHECK (action != 'DELETE' OR entity_type != 'audit_log')
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_performed_by ON audit_log(performed_by);
CREATE INDEX idx_audit_performed_at ON audit_log(performed_at);
CREATE INDEX idx_audit_action ON audit_log(action);

-- =====================================================
-- SYNC CONFLICTS (For offline-first resolution)
-- =====================================================
CREATE TABLE sync_conflict (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  
  local_version JSONB NOT NULL, -- Local changes
  remote_version JSONB NOT NULL, -- Server version
  
  resolution_strategy VARCHAR(50), -- 'manual', 'local-wins', 'remote-wins', 'merge'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  device_id VARCHAR(100)
);

CREATE INDEX idx_conflict_resolved ON sync_conflict(resolved);
CREATE INDEX idx_conflict_entity ON sync_conflict(entity_type, entity_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_updated_at BEFORE UPDATE ON patient
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encounter_updated_at BEFORE UPDATE ON encounter
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medication_updated_at BEFORE UPDATE ON medication
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Complete patient summary
CREATE VIEW patient_summary AS
SELECT 
  p.id,
  p.given_name,
  p.family_name,
  p.birth_date,
  EXTRACT(YEAR FROM AGE(p.birth_date)) AS age,
  p.gender,
  p.photo_path,
  p.active,
  p.deceased,
  pi.identifier_value AS mrn,
  cp_phone.value AS primary_phone,
  cp_email.value AS primary_email,
  MAX(e.start_time) AS last_visit_date,
  COUNT(DISTINCT e.id) AS total_visits
FROM patient p
LEFT JOIN patient_identifier pi ON p.id = pi.patient_id AND pi.identifier_type = 'MRN' AND pi.active = true
LEFT JOIN contact_point cp_phone ON p.id = cp_phone.patient_id AND cp_phone.contact_type = 'phone' AND cp_phone.preferred = true
LEFT JOIN contact_point cp_email ON p.id = cp_email.patient_id AND cp_email.contact_type = 'email' AND cp_email.preferred = true
LEFT JOIN encounter e ON p.id = e.patient_id
GROUP BY p.id, pi.identifier_value, cp_phone.value, cp_email.value;

-- Active allergies view
CREATE VIEW active_allergies AS
SELECT 
  patient_id,
  allergen,
  severity,
  reaction,
  recorded_date
FROM allergy
WHERE status = 'active'
ORDER BY severity DESC, recorded_date DESC;

-- Active medications view
CREATE VIEW active_medications AS
SELECT 
  patient_id,
  medication_name,
  dosage,
  frequency,
  start_date,
  prescribed_by
FROM medication
WHERE status = 'active'
ORDER BY start_date DESC;

-- =====================================================
-- SEED DATA (For testing)
-- =====================================================
COMMENT ON DATABASE ikhaya_health IS 'iKhaya Health - Offline-first EHR for rural clinics';

-- End of schema