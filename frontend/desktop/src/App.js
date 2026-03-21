import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import OfflineBanner from './components/OfflineBanner';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import PatientList from './pages/PatientList';
import PatientDetail from './pages/PatientDetail';
import NewPatientForm from './pages/NewPatientForm';
import EncounterDetail from './pages/EncounterDetail';
import NewEncounterForm from './pages/NewEncounterForm';
import './App.css';

function AppLayout({ children }) {
  return (
    <>
      <OfflineBanner />
      <Navbar />
      <main className="main-content">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/new"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NewPatientForm />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PatientDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <PatientList />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients/:patientId/encounters/new"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <NewEncounterForm />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/encounters/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <EncounterDetail />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
