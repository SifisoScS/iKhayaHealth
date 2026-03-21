import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const PAGE_SIZE = 20;

export default function PatientList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const { data } = await api.get(`/api/patients?${params}`);
      setPatients(data.data || []);
      setTotal(data.count || 0);
    } catch (err) {
      setError('Failed to load patients.');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const canCreate = user?.role === 'doctor' || user?.role === 'admin';

  return (
    <div className="page">
      <header className="page-header">
        <h2>Patients</h2>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => navigate('/patients/new')}>
            + Register Patient
          </button>
        )}
      </header>

      <div className="search-bar">
        <input
          type="search"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <p className="text-muted">Loading…</p>
      ) : patients.length === 0 ? (
        <p className="text-muted">
          {debouncedSearch ? `No patients found for "${debouncedSearch}".` : 'No patients registered.'}
        </p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="table-row-link" onClick={() => navigate(`/patients/${p.id}`)}>
                  <td>
                    <Link to={`/patients/${p.id}`} onClick={(e) => e.stopPropagation()}>
                      {p.given_name} {p.family_name}
                    </Link>
                  </td>
                  <td>{p.gender}</td>
                  <td>{p.birth_date ? new Date(p.birth_date).toLocaleDateString() : '—'}</td>
                  <td>
                    <span className={p.active ? 'badge badge-green' : 'badge badge-gray'}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                className="btn btn-sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
