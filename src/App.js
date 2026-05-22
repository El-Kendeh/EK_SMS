import React, { useState, useEffect } from 'react';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/login';
import SuperadminDashboard from './components/superadmin/SuperadminDashboard';
import ForceChangePassword from './components/ForceChangePassword';

/* ── Impersonation banner (shown when a superadmin is viewing as a school admin) ── */
function ImpersonationBanner() {
  const raw = sessionStorage.getItem('ek-sms-impersonating');
  if (!raw) return null;
  let info = {};
  try { info = JSON.parse(raw); } catch { return null; }

  const handleReturn = () => {
    const prevToken = sessionStorage.getItem('ek-sms-prev-token');
    const prevUser  = sessionStorage.getItem('ek-sms-prev-user');
    sessionStorage.removeItem('ek-sms-impersonating');
    sessionStorage.removeItem('ek-sms-prev-token');
    sessionStorage.removeItem('ek-sms-prev-user');
    if (prevToken && prevUser) {
      localStorage.setItem('token', prevToken);
      localStorage.setItem('user',  prevUser);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: 'linear-gradient(90deg,#1B3FAF,#0EA5E9)',
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 12, padding: '8px 16px', fontSize: '0.8125rem', fontWeight: 600,
    }}>
      <span>👁 Viewing as <strong>{info.schoolName}</strong> admin</span>
      <button
        onClick={handleReturn}
        style={{
          background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)',
          borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '3px 10px',
          fontSize: '0.75rem', fontWeight: 700,
        }}
      >
        ← Return to Superadmin
      </button>
    </div>
  );
}


function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    // On app load, determine where to go based on localStorage user/token
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);

        if (user.must_change_password) {
          setCurrentPage('force-change-password');
          setIsLoading(false);
          return;
        }

        const isSuper = user.is_superuser || user.role === 'superadmin' || user.role === 'admin' || user.role === 'superuser';
        if (isSuper) {
          setCurrentPage('superadmindashboard');
        } else {
          // Non-superadmins must log in as superadmin to access the app for now
          setCurrentPage('login');
        }
      } catch (e) {
        setCurrentPage('login');
      }
    } else {
      setCurrentPage('login');
    }

    setIsLoading(false);
  }, []);

  // When superadmin page becomes active, fetch dashboard data from backend
  useEffect(() => {
    if (currentPage !== 'superadmindashboard') return;

    const token = localStorage.getItem('token');
    if (!token) {
      setFetchError('No auth token');
      return;
    }

    const abort = new AbortController();
    setFetchError(null);

    (async () => {
      try {
        const res = await fetch((process.env.REACT_APP_API_BASE_URL || '') + '/api/superadmin/dashboard', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          signal: abort.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Status ${res.status}: ${text}`);
        }

        const data = await res.json();
        setDashboardData(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setFetchError(err.message || 'Fetch error');
        }
      }
    })();

    return () => abort.abort();
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="App loading-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="App">
        <ImpersonationBanner />
        {currentPage === 'login' && <Login onNavigate={setCurrentPage} />}
        {currentPage === 'force-change-password' && <ForceChangePassword onNavigate={setCurrentPage} />}
        {currentPage === 'superadmindashboard' && (
          <SuperadminDashboard
            onNavigate={setCurrentPage}
            data={dashboardData}
            fetchError={fetchError}
          />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
