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
            <tr><th>Type</th><th>Status</th><th>Chief Complaint</th><th>Date</th></tr>
          </thead>
          <tbody>
            {encounters.map((e) => (
              <tr key={e.id}>
                <td>{e.encounter_type}</td>
                <td><span className="badge">{e.status}</span></td>
                <td>{e.chief_complaint || '—'}</td>
                <td>{e.start_time ? new Date(e.start_time).toLocaleDateString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SimpleListTab({ endpoint, columns }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(endpoint).then((r) => setRows(r.data.data || [])).finally(() => setLoading(false));
  }, [endpoint]);

  if (loading) return <p className="text-muted">Loading…</p>;
  if (rows.length === 0) return <p className="text-muted">None recorded.</p>;

  return (
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
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canWrite = user?.role === 'doctor' || user?.role === 'admin';

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
          <SimpleListTab
            endpoint={`/api/patients/${id}/allergies`}
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
          <SimpleListTab
            endpoint={`/api/patients/${id}/medications`}
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
          <SimpleListTab
            endpoint={`/api/patients/${id}/diagnoses`}
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
          <SimpleListTab
            endpoint={`/api/patients/${id}/immunizations`}
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
