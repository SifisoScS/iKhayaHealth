import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const OBS_PRESETS = [
  { code: '8867-4', display: 'Heart rate', unit: '/min' },
  { code: '8480-6', display: 'Systolic BP', unit: 'mmHg' },
  { code: '8462-4', display: 'Diastolic BP', unit: 'mmHg' },
  { code: '29463-7', display: 'Body weight', unit: 'kg' },
  { code: '8310-5', display: 'Body temperature', unit: '°C' },
  { code: '59408-5', display: 'O₂ saturation', unit: '%' },
  { code: '9279-1', display: 'Respiratory rate', unit: '/min' },
];

function ObsForm({ encounterId, onAdded }) {
  const [form, setForm] = useState({ code: '', display: '', value_quantity: '', unit: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handlePreset(e) {
    const preset = OBS_PRESETS.find((p) => p.code === e.target.value);
    if (preset) setForm((f) => ({ ...f, code: preset.code, display: preset.display, unit: preset.unit }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.code || form.value_quantity === '') {
      setError('Code and value are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post(`/api/encounters/${encounterId}/observations`, {
        code: form.code,
        display: form.display,
        value_quantity: parseFloat(form.value_quantity),
        unit: form.unit,
      });
      onAdded(data);
      setForm({ code: '', display: '', value_quantity: '', unit: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record observation.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="obs-form">
      <h4>Add Observation</h4>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="form-row">
        <div className="form-group">
          <label>Preset</label>
          <select onChange={handlePreset} defaultValue="">
            <option value="">Select vital sign…</option>
            {OBS_PRESETS.map((p) => (
              <option key={p.code} value={p.code}>{p.display}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>LOINC Code *</label>
          <input
            type="text"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            placeholder="e.g. 8867-4"
            required
          />
        </div>
        <div className="form-group">
          <label>Value *</label>
          <input
            type="number"
            step="any"
            value={form.value_quantity}
            onChange={(e) => setForm((f) => ({ ...f, value_quantity: e.target.value }))}
            required
          />
        </div>
        <div className="form-group">
          <label>Unit</label>
          <input
            type="text"
            value={form.unit}
            onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            placeholder="e.g. /min"
          />
        </div>
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Recording…' : 'Record Observation'}
      </button>
    </form>
  );
}

export default function EncounterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [encounter, setEncounter] = useState(null);
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canRecord = ['doctor', 'nurse', 'admin'].includes(user?.role);

  useEffect(() => {
    async function load() {
      try {
        const [encRes, obsRes] = await Promise.all([
          api.get(`/api/encounters/${id}`),
          api.get(`/api/encounters/${id}/observations`),
        ]);
        setEncounter(encRes.data);
        setObservations(obsRes.data.data || []);
      } catch {
        setError('Encounter not found.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleObsAdded(obs) {
    setObservations((prev) => [obs, ...prev]);
  }

  if (loading) return <div className="page"><p className="text-muted">Loading…</p></div>;
  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>;

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div>
          <h2>Encounter</h2>
          <span className="badge">{encounter.status}</span>
        </div>
      </header>

      <div className="card mb-4">
        <div className="info-grid">
          <div className="info-row"><span className="info-label">Type</span><span className="info-value">{encounter.encounter_type}</span></div>
          <div className="info-row"><span className="info-label">Status</span><span className="info-value">{encounter.status}</span></div>
          <div className="info-row"><span className="info-label">Chief Complaint</span><span className="info-value">{encounter.chief_complaint || '—'}</span></div>
          <div className="info-row"><span className="info-label">Assessment</span><span className="info-value">{encounter.assessment || '—'}</span></div>
          <div className="info-row"><span className="info-label">Plan</span><span className="info-value">{encounter.plan || '—'}</span></div>
          <div className="info-row"><span className="info-label">Start</span><span className="info-value">{encounter.start_time ? new Date(encounter.start_time).toLocaleString() : '—'}</span></div>
        </div>
      </div>

      <div className="card">
        <h3>Observations / Vital Signs</h3>
        {observations.length === 0 ? (
          <p className="text-muted">No observations recorded.</p>
        ) : (
          <table className="table mt-2">
            <thead>
              <tr><th>Code</th><th>Description</th><th>Value</th><th>Unit</th><th>Recorded</th></tr>
            </thead>
            <tbody>
              {observations.map((o) => (
                <tr key={o.id}>
                  <td><code>{o.code}</code></td>
                  <td>{o.display || '—'}</td>
                  <td>{o.value_quantity ?? '—'}</td>
                  <td>{o.unit || '—'}</td>
                  <td>{o.recorded_at ? new Date(o.recorded_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {canRecord && (
          <div className="mt-4">
            <ObsForm encounterId={id} onAdded={handleObsAdded} />
          </div>
        )}
      </div>
    </div>
  );
}
