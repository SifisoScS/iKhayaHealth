import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-title">{title}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ patients: null, encounters: null, apiStatus: null });
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [patientsRes, encountersRes, healthRes] = await Promise.allSettled([
          api.get('/api/patients?limit=5'),
          api.get('/api/encounters?limit=5'),
          api.get('/health'),
        ]);

        if (patientsRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, patients: patientsRes.value.data.count }));
          setRecentPatients(patientsRes.value.data.data || []);
        }
        if (encountersRes.status === 'fulfilled') {
          setStats((s) => ({ ...s, encounters: encountersRes.value.data.count }));
        }
        if (healthRes.status === 'fulfilled') {
          const h = healthRes.value.data;
          const latency = h.db?.latency_ms != null ? `${h.db.latency_ms}ms` : null;
          setStats((s) => ({ ...s, apiStatus: latency ? `Online (${latency})` : 'Online' }));
        } else {
          setStats((s) => ({ ...s, apiStatus: 'Unreachable' }));
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h2>Dashboard</h2>
        <p className="page-subtitle">Welcome back, {user?.username}</p>
      </header>

      <div className="stat-grid">
        <StatCard title="Total Patients" value={stats.patients} icon="👤" color="blue" />
        <StatCard title="Encounters" value={stats.encounters} icon="📋" color="green" />
        <StatCard title="API Status" value={stats.apiStatus} icon="⟳" color={stats.apiStatus === 'Unreachable' ? 'red' : 'yellow'} />
      </div>

      <div className="card mt-4">
        <div className="card-header">
          <h3>Recent Patients</h3>
          <Link to="/patients" className="btn btn-sm">View all</Link>
        </div>
        {loading ? (
          <p className="text-muted">Loading…</p>
        ) : recentPatients.length === 0 ? (
          <p className="text-muted">No patients registered yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
              </tr>
            </thead>
            <tbody>
              {recentPatients.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/patients/${p.id}`}>
                      {p.given_name} {p.family_name}
                    </Link>
                  </td>
                  <td>{p.gender}</td>
                  <td>{p.birth_date ? new Date(p.birth_date).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
