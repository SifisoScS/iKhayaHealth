import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const GENDER_OPTIONS = ['male', 'female', 'other', 'unknown'];

export default function NewPatientForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    given_name: '',
    family_name: '',
    birth_date: '',
    gender: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: '' }));
    setServerError('');
  }

  function validate() {
    const errs = {};
    if (!form.given_name.trim()) errs.given_name = 'First name is required.';
    if (!form.family_name.trim()) errs.family_name = 'Last name is required.';
    if (!form.birth_date) errs.birth_date = 'Date of birth is required.';
    if (!form.gender) errs.gender = 'Gender is required.';
    return errs;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.phone) delete payload.phone;
      if (!payload.address) delete payload.address;

      const { data } = await api.post('/api/patients', payload);
      navigate(`/patients/${data.id}`);
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Failed to register patient.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <h2>Register New Patient</h2>
      </header>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div className="alert alert-error mb-4" role="alert">
              {serverError}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="given_name">First Name *</label>
              <input
                id="given_name"
                name="given_name"
                type="text"
                value={form.given_name}
                onChange={handleChange}
                disabled={loading}
                autoFocus
              />
              {errors.given_name && <span className="field-error">{errors.given_name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="family_name">Last Name *</label>
              <input
                id="family_name"
                name="family_name"
                type="text"
                value={form.family_name}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.family_name && <span className="field-error">{errors.family_name}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="birth_date">Date of Birth *</label>
              <input
                id="birth_date"
                name="birth_date"
                type="date"
                value={form.birth_date}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.birth_date && <span className="field-error">{errors.birth_date}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender *</label>
              <select
                id="gender"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                disabled={loading}
              >
                <option value="">Select gender…</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
              {errors.gender && <span className="field-error">{errors.gender}</span>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone (optional)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
              disabled={loading}
              placeholder="+27 XX XXX XXXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Address (optional)</label>
            <textarea
              id="address"
              name="address"
              rows={2}
              value={form.address}
              onChange={handleChange}
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Registering…' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
