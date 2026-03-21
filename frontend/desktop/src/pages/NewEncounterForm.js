import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const ENCOUNTER_TYPES = [
  { value: 'ambulatory', label: 'Ambulatory' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'inpatient', label: 'Inpatient' },
  { value: 'home_visit', label: 'Home Visit' },
];

function toLocalDatetimeValue(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NewEncounterForm() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    encounter_type: 'ambulatory',
    start_time: toLocalDatetimeValue(new Date()),
    chief_complaint: '',
    reason_for_visit: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/api/encounters', {
        patient_id: patientId,
        encounter_type: form.encounter_type,
        start_time: new Date(form.start_time).toISOString(),
        ...(form.chief_complaint && { chief_complaint: form.chief_complaint }),
        ...(form.reason_for_visit && { reason_for_visit: form.reason_for_visit }),
        ...(form.location && { location: form.location }),
      });
      navigate(`/encounters/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create encounter.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <h2>New Encounter</h2>
      </header>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="form-stack">
          <div className="form-row">
            <div className="form-group">
              <label>Encounter Type</label>
              <select value={form.encounter_type} onChange={set('encounter_type')}>
                {ENCOUNTER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Start Time *</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={set('start_time')}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Chief Complaint</label>
            <input
              type="text"
              value={form.chief_complaint}
              onChange={set('chief_complaint')}
              placeholder="Primary reason for visit"
            />
          </div>
          <div className="form-group">
            <label>Reason for Visit</label>
            <input
              type="text"
              value={form.reason_for_visit}
              onChange={set('reason_for_visit')}
              placeholder="Additional context"
            />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={form.location}
              onChange={set('location')}
              placeholder="e.g. Consultation Room 2"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Encounter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
