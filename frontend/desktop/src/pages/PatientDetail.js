import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TABS = ['Overview', 'Encounters', 'Allergies', 'Medications', 'Diagnoses', 'Immunizations'];

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}

// ── Encounters ────────────────────────────────────────────────────────────────

function EncountersTab({ patientId, canCreate, navigate }) {
  const [encounters, setEncounters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/encounters?patient_id=${patientId}`)
      .then((r) => setEncounters(r.data.data || []))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      {canCreate && (
        <button
          className="btn btn-primary mb-3"
          onClick={() => navigate(`/patients/${patientId}/encounters/new`)}
        >
          + New Encounter
        </button>
      )}
      {encounters.length === 0 ? (
        <p className="text-muted">No encounters recorded.</p>
      ) : (
        <table className="table">
          <thead>
            <tr><th>Type</th><th>Status</th><th>Chief Complaint</th><th>Date</th><th></th></tr>
          </thead>
          <tbody>
            {encounters.map((e) => (
              <tr key={e.id}>
                <td>{e.encounter_type}</td>
                <td><span className="badge">{e.status}</span></td>
                <td>{e.chief_complaint || '—'}</td>
                <td>{e.start_time ? new Date(e.start_time).toLocaleDateString() : '—'}</td>
                <td>
                  <Link to={`/encounters/${e.id}`} className="btn btn-sm">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Generic clinical tab with inline add form ─────────────────────────────────

function ClinicalTab({ endpoint, columns, canWrite, AddForm }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get(endpoint).then((r) => setRows(r.data.data || [])).finally(() => setLoading(false));
  }, [endpoint]);

  function handleAdded(row) {
    setRows((prev) => [row, ...prev]);
    setShowForm(false);
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <div>
      {canWrite && (
        <button
          className="btn btn-primary mb-3"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      )}
      {showForm && (
        <AddForm endpoint={endpoint} onAdded={handleAdded} onCancel={() => setShowForm(false)} />
      )}
      {rows.length === 0 ? (
        <p className="text-muted">None recorded.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id || i}>
                {columns.map((c) => (
                  <td key={c.key}>
                    {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Allergy form ──────────────────────────────────────────────────────────────

function AllergyForm({ endpoint, onAdded, onCancel }) {
  const [form, setForm] = useState({ allergen: '', allergy_type: 'allergy', category: '', severity: '', reaction: '', onset_date: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(endpoint, {
        allergen: form.allergen,
        allergy_type: form.allergy_type,
        ...(form.category && { category: form.category }),
        ...(form.severity && { severity: form.severity }),
        ...(form.reaction && { reaction: form.reaction }),
        ...(form.onset_date && { onset_date: form.onset_date }),
        ...(form.notes && { notes: form.notes }),
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add allergy.');
    } finally { setLoading(false); }
  }

  return (
    <div className="card mb-3">
      <h4>Add Allergy</h4>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label>Allergen *</label>
            <input type="text" value={form.allergen} onChange={set('allergen')} placeholder="e.g. Penicillin" required />
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={form.allergy_type} onChange={set('allergy_type')}>
              <option value="allergy">Allergy</option>
              <option value="intolerance">Intolerance</option>
              <option value="adverse-reaction">Adverse Reaction</option>
            </select>
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={set('category')}>
              <option value="">— Select —</option>
              <option value="food">Food</option>
              <option value="medication">Medication</option>
              <option value="environment">Environment</option>
              <option value="biologic">Biologic</option>
            </select>
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select value={form.severity} onChange={set('severity')}>
              <option value="">— Select —</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
              <option value="life-threatening">Life-threatening</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Reaction</label>
            <input type="text" value={form.reaction} onChange={set('reaction')} placeholder="e.g. Rash, anaphylaxis" />
          </div>
          <div className="form-group">
            <label>Onset Date</label>
            <input type="date" value={form.onset_date} onChange={set('onset_date')} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Allergy'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Medication form ───────────────────────────────────────────────────────────

function MedicationForm({ endpoint, onAdded, onCancel }) {
  const [form, setForm] = useState({ medication_name: '', start_date: '', dosage: '', route: '', frequency: '', end_date: '', indication: '', instructions: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(endpoint, {
        medication_name: form.medication_name,
        start_date: form.start_date,
        ...(form.dosage && { dosage: form.dosage }),
        ...(form.route && { route: form.route }),
        ...(form.frequency && { frequency: form.frequency }),
        ...(form.end_date && { end_date: form.end_date }),
        ...(form.indication && { indication: form.indication }),
        ...(form.instructions && { instructions: form.instructions }),
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add medication.');
    } finally { setLoading(false); }
  }

  return (
    <div className="card mb-3">
      <h4>Add Medication</h4>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label>Medication Name *</label>
            <input type="text" value={form.medication_name} onChange={set('medication_name')} placeholder="e.g. Metformin 500mg" required />
          </div>
          <div className="form-group">
            <label>Start Date *</label>
            <input type="date" value={form.start_date} onChange={set('start_date')} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Dosage</label>
            <input type="text" value={form.dosage} onChange={set('dosage')} placeholder="e.g. 500mg" />
          </div>
          <div className="form-group">
            <label>Route</label>
            <select value={form.route} onChange={set('route')}>
              <option value="">— Select —</option>
              <option value="oral">Oral</option>
              <option value="IV">IV</option>
              <option value="IM">IM</option>
              <option value="topical">Topical</option>
              <option value="inhalation">Inhalation</option>
              <option value="subcutaneous">Subcutaneous</option>
            </select>
          </div>
          <div className="form-group">
            <label>Frequency</label>
            <input type="text" value={form.frequency} onChange={set('frequency')} placeholder="e.g. Twice daily" />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Indication</label>
            <input type="text" value={form.indication} onChange={set('indication')} placeholder="Reason for prescribing" />
          </div>
          <div className="form-group">
            <label>Instructions</label>
            <input type="text" value={form.instructions} onChange={set('instructions')} placeholder="e.g. Take with food" />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Medication'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Diagnosis form ────────────────────────────────────────────────────────────

function DiagnosisForm({ endpoint, onAdded, onCancel }) {
  const [form, setForm] = useState({ condition_name: '', condition_code: '', category: '', severity: '', onset_date: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(endpoint, {
        condition_name: form.condition_name,
        ...(form.condition_code && { condition_code: form.condition_code }),
        ...(form.category && { category: form.category }),
        ...(form.severity && { severity: form.severity }),
        ...(form.onset_date && { onset_date: form.onset_date }),
        ...(form.notes && { notes: form.notes }),
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add diagnosis.');
    } finally { setLoading(false); }
  }

  return (
    <div className="card mb-3">
      <h4>Add Diagnosis</h4>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label>Condition Name *</label>
            <input type="text" value={form.condition_name} onChange={set('condition_name')} placeholder="e.g. Type 2 Diabetes" required />
          </div>
          <div className="form-group">
            <label>ICD-10 Code</label>
            <input type="text" value={form.condition_code} onChange={set('condition_code')} placeholder="e.g. E11" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category} onChange={set('category')}>
              <option value="">— Select —</option>
              <option value="problem-list-item">Problem List Item</option>
              <option value="encounter-diagnosis">Encounter Diagnosis</option>
            </select>
          </div>
          <div className="form-group">
            <label>Severity</label>
            <select value={form.severity} onChange={set('severity')}>
              <option value="">— Select —</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </select>
          </div>
          <div className="form-group">
            <label>Onset Date</label>
            <input type="date" value={form.onset_date} onChange={set('onset_date')} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <input type="text" value={form.notes} onChange={set('notes')} />
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Add Diagnosis'}</button>
        </div>
      </form>
    </div>
  );
}

// ── Immunization form ─────────────────────────────────────────────────────────

function ImmunizationForm({ endpoint, onAdded, onCancel }) {
  const [form, setForm] = useState({ vaccine_name: '', administration_date: '', vaccine_code: '', dose_number: '', lot_number: '', site: '', route: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data } = await api.post(endpoint, {
        vaccine_name: form.vaccine_name,
        administration_date: form.administration_date,
        ...(form.vaccine_code && { vaccine_code: form.vaccine_code }),
        ...(form.dose_number && { dose_number: parseInt(form.dose_number, 10) }),
        ...(form.lot_number && { lot_number: form.lot_number }),
        ...(form.site && { site: form.site }),
        ...(form.route && { route: form.route }),
        ...(form.notes && { notes: form.notes }),
      });
      onAdded(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record immunization.');
    } finally { setLoading(false); }
  }

  return (
    <div className="card mb-3">
      <h4>Record Immunization</h4>
      {error && <div className="alert alert-error">{error}</div>}
      <form onSubmit={handleSubmit} className="form-stack">
        <div className="form-row">
          <div className="form-group">
            <label>Vaccine Name *</label>
            <input type="text" value={form.vaccine_name} onChange={set('vaccine_name')} placeholder="e.g. COVID-19 mRNA" required />
          </div>
          <div className="form-group">
            <label>Administration Date *</label>
            <input type="date" value={form.administration_date} onChange={set('administration_date')} required />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Vaccine Code</label>
            <input type="text" value={form.vaccine_code} onChange={set('vaccine_code')} placeholder="CVX / SNOMED code" />
          </div>
          <div className="form-group">
            <label>Dose #</label>
            <input type="number" min="1" value={form.dose_number} onChange={set('dose_number')} />
          </div>
          <div className="form-group">
            <label>Lot Number</label>
            <input type="text" value={form.lot_number} onChange={set('lot_number')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Site</label>
            <input type="text" value={form.site} onChange={set('site')} placeholder="e.g. Left deltoid" />
          </div>
          <div className="form-group">
            <label>Route</label>
            <select value={form.route} onChange={set('route')}>
              <option value="">— Select —</option>
              <option value="intramuscular">Intramuscular</option>
              <option value="subcutaneous">Subcutaneous</option>
              <option value="oral">Oral</option>
              <option value="intranasal">Intranasal</option>
            </select>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <input type="text" value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : 'Record Immunization'}</button>
        </div>
      </form>
    </div>
  );
}

// ── PatientDetail ─────────────────────────────────────────────────────────────

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canWrite = user?.role === 'doctor' || user?.role === 'admin';
  const canWriteImmunization = canWrite || user?.role === 'nurse';

  useEffect(() => {
    api.get(`/api/patients/${id}`)
      .then((r) => setPatient(r.data))
      .catch(() => setError('Patient not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><p className="text-muted">Loading…</p></div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate('/patients')}>← Patients</button>
        <div>
          <h2>{patient.given_name} {patient.family_name}</h2>
          <span className={patient.active ? 'badge badge-green' : 'badge badge-gray'}>
            {patient.active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <Link to={`/api/patients/${id}/export`} className="btn btn-sm" download>
          Export Data
        </Link>
      </header>

      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-panel card mt-2">
        {activeTab === 'Overview' && (
          <div className="info-grid">
            <InfoRow label="Given Name" value={patient.given_name} />
            <InfoRow label="Family Name" value={patient.family_name} />
            <InfoRow label="Date of Birth" value={patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : null} />
            <InfoRow label="Gender" value={patient.gender} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Address" value={patient.address} />
            <InfoRow label="Registered" value={patient.created_at ? new Date(patient.created_at).toLocaleDateString() : null} />
          </div>
        )}

        {activeTab === 'Encounters' && (
          <EncountersTab patientId={id} canCreate={canWrite} navigate={navigate} />
        )}

        {activeTab === 'Allergies' && (
          <ClinicalTab
            endpoint={`/api/patients/${id}/allergies`}
            canWrite={canWrite}
            AddForm={AllergyForm}
            columns={[
              { key: 'allergen', label: 'Allergen' },
              { key: 'allergy_type', label: 'Type' },
              { key: 'severity', label: 'Severity' },
              { key: 'reaction', label: 'Reaction' },
              { key: 'status', label: 'Status', render: (v) => <span className="badge">{v}</span> },
            ]}
          />
        )}

        {activeTab === 'Medications' && (
          <ClinicalTab
            endpoint={`/api/patients/${id}/medications`}
            canWrite={canWrite}
            AddForm={MedicationForm}
            columns={[
              { key: 'medication_name', label: 'Medication' },
              { key: 'dosage', label: 'Dosage' },
              { key: 'route', label: 'Route' },
              { key: 'frequency', label: 'Frequency' },
              { key: 'status', label: 'Status', render: (v) => <span className="badge">{v}</span> },
            ]}
          />
        )}

        {activeTab === 'Diagnoses' && (
          <ClinicalTab
            endpoint={`/api/patients/${id}/diagnoses`}
            canWrite={canWrite}
            AddForm={DiagnosisForm}
            columns={[
              { key: 'condition_name', label: 'Condition' },
              { key: 'condition_code', label: 'Code' },
              { key: 'severity', label: 'Severity' },
              { key: 'status', label: 'Status', render: (v) => <span className="badge">{v}</span> },
              { key: 'onset_date', label: 'Onset', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
            ]}
          />
        )}

        {activeTab === 'Immunizations' && (
          <ClinicalTab
            endpoint={`/api/patients/${id}/immunizations`}
            canWrite={canWriteImmunization}
            AddForm={ImmunizationForm}
            columns={[
              { key: 'vaccine_name', label: 'Vaccine' },
              { key: 'dose_number', label: 'Dose #' },
              { key: 'administration_date', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString() : '—' },
              { key: 'route', label: 'Route' },
              { key: 'lot_number', label: 'Lot #' },
            ]}
          />
        )}
      </div>
    </div>
  );
}
